import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime, nowDatetime } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';
import { clearRecommendCache } from '../recommend/recommend.service';

/** 推荐算法默认参数 */
const ALGO_DEFAULTS: Record<string, number> = {
  w_cb: 0.4, w_cf: 0.2, w_itemcf: 0.2, w_hot: 0.2,
  total_need: 50, decay_days: 30,
  w_click: 10, w_stay_max: 5, w_view: 1,
  explore_cold: 0.5, explore_grow: 0.35, explore_mature: 0.2,
};

/** pHash 汉明距离（16 位 hex） */
function hammingHex(a: string, b: string): number {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

/** 读算法参数（api_settings algo_*） */
async function algoSettingsAdmin(): Promise<Record<string, number>> {
  const out = { ...ALGO_DEFAULTS };
  try {
    const [rows] = await db.query("SELECT skey, svalue FROM api_settings WHERE skey LIKE 'algo_%'");
    for (const r of rows as Array<{ skey: string; svalue: string | null }>) {
      const k = r.skey.slice(5);
      if (!(k in ALGO_DEFAULTS)) continue;
      const v = (r.svalue || '').trim();
      if (!v) continue;
      out[k] = parseFloat(v);
    }
  } catch { /* defaults */ }
  return out;
}

/** 清推荐缓存（recommend.service 的 cacheMap，按 recommend: 前缀清除） */
const forgetRecommendCache = clearRecommendCache;

@Injectable()
export class AdminRecommendService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET/POST /admin_recommend?action=xxx */
  async handle(
    action: string,
    method: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    const str = (v: unknown, d = '') => (v != null ? String(v) : d);
    const int = (v: unknown, d = 0) => {
      const n = parseInt(str(v), 10);
      return isNaN(n) ? d : n;
    };
    const get = (k: string) => {
      const b = body && body[k] !== undefined ? body[k] : undefined;
      return b !== undefined ? b : query[k];
    };

    switch (action) {
      // ============ 内容列表 ============
      case 'contents': {
        const search = str(get('search')).trim();
        const category = str(get('category')).trim();
        const source = str(get('source')).trim();
        const limit = Math.min(100, Math.max(1, int(get('limit'), 50)));
        const page = Math.max(1, int(get('page'), 0) || 1);
        const where = ["c.image_url != ''"];
        const params: unknown[] = [];
        if (search) { where.push('c.title LIKE ?'); params.push(`%${search}%`); }
        if (category) { where.push('c.category = ?'); params.push(category); }
        if (source === 'doo' || source === 'goo') { where.push('c.source = ?'); params.push(source); }
        const whereSql = where.join(' AND ');
        const [cntRows] = await db.query(`SELECT COUNT(*) AS c FROM content c WHERE ${whereSql}`, params);
        const total = toInt((cntRows as Array<{ c: number | string }>)[0].c);
        let sql = `SELECT c.id, c.title, c.category, c.tags, c.image_url, c.video_url, c.status, c.recommended, c.is_pinned, c.pin_time, c.source, c.created_at,
                          (SELECT COUNT(*) FROM user_behaviors b WHERE b.content_id = c.id AND b.type = 'content_click') AS click_cnt
                   FROM content c WHERE ${whereSql} ORDER BY c.is_pinned DESC, c.pin_time DESC, c.id DESC LIMIT ${limit}`;
        if (page > 1) sql += ` OFFSET ${(page - 1) * limit}`;
        const [rows] = await db.query(sql, params);
        const cats: string[] = [];
        try {
          const [catRows] = await db.query("SELECT DISTINCT category FROM content WHERE image_url != '' AND category != ''");
          for (const c of catRows as Array<{ category: string }>) cats.push(c.category);
        } catch { /* [] */ }
        const items = (rows as Array<Record<string, unknown>>).map((r) => ({
          ...r,
          pin_time: r.pin_time != null ? fmtDatetime(String(r.pin_time)) : null,
          created_at: r.created_at != null ? fmtDatetime(String(r.created_at)) : null,
          click_cnt: toInt(r.click_cnt),
        }));
        return ok('成功', { items, categories: cats, total, page, limit });
      }

      // ============ 算法参数读取 ============
      case 'algo_config': {
        const algo = await algoSettingsAdmin();
        return ok('成功', {
          algo,
          weights_text: `CB ${algo.w_cb.toFixed(2)} + UserCF ${algo.w_cf.toFixed(2)} + ItemCF ${algo.w_itemcf.toFixed(2)} + Hot ${algo.w_hot.toFixed(2)}`,
          explore_text: `冷启动 ${Math.round(algo.explore_cold * 100)}% / 成长 ${Math.round(algo.explore_grow * 100)}% / 成熟 ${Math.round(algo.explore_mature * 100)}%`,
        });
      }

      // ============ 算法参数保存 ============
      case 'save_algo_config': {
        const fields = ['w_cb', 'w_cf', 'w_itemcf', 'w_hot', 'total_need', 'decay_days', 'w_click', 'w_stay_max', 'w_view', 'explore_cold', 'explore_grow', 'explore_mature'];
        let saved = 0;
        for (const f of fields) {
          if (body[f] === undefined || body[f] === null) continue;
          const v = str(body[f]).trim();
          if (!v || isNaN(parseFloat(v))) continue;
          await db.query('INSERT INTO api_settings (skey, svalue) VALUES (?, ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)', [`algo_${f}`, v]);
          saved++;
        }
        if (saved > 0) forgetRecommendCache();
        return ok(`已保存 ${saved} 项算法参数（推荐缓存已清）`);
      }

      // ============ 相似图片组（按类别） ============
      case 'groups': {
        const [rows] = await db.query(
          `SELECT c.id, c.title, c.image_url, c.category, c.recommended,
                  (SELECT COUNT(*) FROM user_behaviors b WHERE b.content_id = c.id AND b.type = 'content_click') AS click_cnt
           FROM content c WHERE c.image_url != '' AND c.status = 'published'
           ORDER BY c.category, c.id DESC`,
        );
        const byCat: Record<string, Array<Record<string, unknown>>> = {};
        for (const r of rows as Array<Record<string, unknown>>) {
          const cat = String(r.category || '未分类');
          if (!byCat[cat]) byCat[cat] = [];
          byCat[cat].push(r);
        }
        const groups = Object.entries(byCat).map(([cat, items]) => ({
          category: cat,
          size: items.length,
          click_total: items.reduce((s, it) => s + toInt(it.click_cnt), 0),
          recommended_count: items.filter((it) => toInt(it.recommended) === 1).length,
          items: items.slice(0, 8).map((it) => ({
            id: toInt(it.id),
            title: it.title ? it.title : `内容 #${it.id}`,
            image_url: it.image_url,
            category: it.category,
            recommended: toInt(it.recommended),
            click_cnt: toInt(it.click_cnt),
          })),
        })).sort((a, b) => b.size - a.size);
        return ok('成功', {
          groups,
          total_categories: groups.length,
          total_items: (rows as unknown[]).length,
        });
      }

      // ============ 视觉指纹组 ============
      case 'fingerprints': {
        const [rows] = await db.query(
          `SELECT f.group_id, f.source_id, f.phash, f.dhash, c.title, c.image_url, c.recommended
           FROM image_fingerprints f
           LEFT JOIN content c ON f.source_table = 'content' AND c.id = f.source_id
           WHERE f.group_id > 0 AND f.phash IS NOT NULL AND f.phash <> ''
           ORDER BY f.group_id, f.source_id`,
        );
        const byGroup: Record<number, Array<Record<string, unknown>>> = {};
        for (const r of rows as Array<Record<string, unknown>>) {
          const gid = toInt(r.group_id);
          if (!byGroup[gid]) byGroup[gid] = [];
          byGroup[gid].push(r);
        }
        const groups = Object.entries(byGroup).map(([gidStr, items]) => {
          const pairs: Array<Record<string, unknown>> = [];
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const h = hammingHex(String(items[i].phash || ''), String(items[j].phash || ''));
              pairs.push({ a: toInt(items[i].source_id), b: toInt(items[j].source_id), hamming: h, similarity: Math.round(((64 - h) / 64) * 1000) / 10 });
            }
          }
          return {
            group_id: parseInt(gidStr, 10),
            size: items.length,
            recommended_count: items.filter((it) => toInt(it.recommended) === 1).length,
            items: items.map((it) => ({
              id: toInt(it.source_id),
              title: it.title ? it.title : `内容 #${it.source_id}`,
              image_url: it.image_url,
              phash: it.phash,
              recommended: toInt(it.recommended),
            })),
            pairs,
          };
        }).sort((a, b) => (b.size - a.size) || (b.recommended_count - a.recommended_count));
        const total = await this.fpCount("WHERE source_table = 'content'");
        const ungrouped = await this.fpCount("WHERE source_table = 'content' AND (group_id <= 0 OR group_id IS NULL)");
        return ok('成功', { groups, total_fingerprints: total, grouped: total - ungrouped, ungrouped });
      }

      // ============ 一键去重 ============
      case 'dedup': {
        const groupId = int(get('group_id'));
        const all = !!get('all');
        let groupIds: number[] = [];
        if (all) {
          const [rows] = await db.query("SELECT DISTINCT group_id FROM image_fingerprints WHERE source_table = 'content' AND group_id > 0");
          for (const r of rows as Array<{ group_id: number | string }>) groupIds.push(toInt(r.group_id));
        } else if (Array.isArray(get('group_ids'))) {
          for (const g of get('group_ids') as unknown[]) { const x = toInt(g); if (x > 0 && !groupIds.includes(x)) groupIds.push(x); }
        } else if (typeof get('group_ids') === 'string') {
          for (const g of String(get('group_ids')).split(',')) { const x = toInt(g.trim()); if (x > 0 && !groupIds.includes(x)) groupIds.push(x); }
        } else if (groupId > 0) {
          groupIds.push(groupId);
        }
        if (!groupIds.length) return new HttpFail(400, '参数无效: 缺少 group_id / group_ids / all');

        let processed = 0, totalRemoved = 0;
        const keptIds: number[] = [];
        for (const gid of groupIds) {
          const r = await this.dedupOne(gid);
          processed++;
          totalRemoved += r.removed;
          if (r.keptId > 0) keptIds.push(r.keptId);
        }
        forgetRecommendCache();
        return ok(`已去重 ${processed} 组: 移出推荐 ${totalRemoved} 张, 保留 ${keptIds.join(',')}`, {
          processed, removed: totalRemoved, kept: keptIds,
        });
      }

      // ============ 置顶 ============
      case 'pin': {
        const id = int(get('id'));
        if (id <= 0 || get('pinned') === undefined) return new HttpFail(400, '参数无效: 需要 id 和 pinned');
        const pinned = get('pinned') ? 1 : 0;
        await db.query('UPDATE content SET is_pinned = ?, pin_time = ? WHERE id = ?', [pinned, pinned ? nowDatetime() : null, id]);
        forgetRecommendCache();
        return ok(pinned ? `已置顶 #${id}（推荐流最前）` : `已取消置顶 #${id}`, { id, is_pinned: pinned });
      }

      // ============ 切换推荐状态 ============
      case 'toggle': {
        const id = int(get('id'));
        const val = get('recommended') !== undefined ? int(get('recommended')) : -1;
        if (id <= 0 || ![0, 1].includes(val)) return new HttpFail(400, '参数无效');
        await db.query('UPDATE content SET recommended = ? WHERE id = ?', [val, id]);
        forgetRecommendCache();
        return ok(`已${val ? '加入' : '移出'}推荐池`, { id, recommended: val });
      }

      // ============ 单张 AI 重打标（GLM 视觉，Node 侧待接入） ============
      case 'tag_one': {
        return new HttpFail(500, 'AI 打标请在 PHP 引擎执行（Node 侧视觉管线待接入）');
      }

      // ============ overview ============
      default: {
        const total = await this.count("SELECT COUNT(*) AS c FROM content WHERE image_url != ''");
        const recOn = await this.count("SELECT COUNT(*) AS c FROM content WHERE image_url != '' AND recommended = 1");
        const clickCnt = await this.count("SELECT COUNT(*) AS c FROM user_behaviors WHERE type = 'content_click'");
        const viewCnt = await this.count("SELECT COUNT(*) AS c FROM user_behaviors WHERE type = 'page_view'");
        const stayCnt = await this.count("SELECT COUNT(*) AS c FROM user_behaviors WHERE type = 'page_stay'");
        const recViewCnt = await this.count("SELECT COUNT(*) AS c FROM user_behaviors WHERE type = 'rec_view'");
        const users = await this.count('SELECT COUNT(DISTINCT user_id) AS c FROM user_behaviors');
        const denom = viewCnt + recViewCnt;
        const ctr = denom > 0 ? Math.round((clickCnt / denom) * 10000) / 100 : 0;
        const [hotRows] = await db.query(
          `SELECT c.id, c.title, c.image_url, c.recommended,
                  (SELECT COUNT(*) FROM user_behaviors b WHERE b.content_id = c.id AND b.type = 'content_click') AS click_cnt
           FROM content c WHERE c.image_url != '' ORDER BY click_cnt DESC, c.id DESC LIMIT 10`,
        );
        const algo = await algoSettingsAdmin();
        return ok('成功', {
          algorithm: {
            version: 'fusion-2.2',
            name: '融合推荐（内容 + UserCF/ItemCF 协同 + 热度 + 类别配额探索）',
            weights: `CB ${algo.w_cb.toFixed(2)} + UserCF ${algo.w_cf.toFixed(2)} + ItemCF ${algo.w_itemcf.toFixed(2)} + Hot ${algo.w_hot.toFixed(2)}`,
            behavior_weights: `click ${Math.round(algo.w_click)} / stay(时长/60 上限${Math.round(algo.w_stay_max)}) / view ${Math.round(algo.w_view)}`,
            decay_days: algo.decay_days,
            mmr_limit: 4,
            visual: 'pHash 粗分组 + SIFT RANSAC 复核,同源图去重/偏好泛化',
            explore: `探索比例按行为量动态调整: 冷启动 ${Math.round(algo.explore_cold * 100)}% / 成长 ${Math.round(algo.explore_grow * 100)}% / 成熟 ${Math.round(algo.explore_mature * 100)}%,偏好类别按画像权重分配配额`,
          },
          total,
          recommended_on: recOn,
          behavior: { content_click: clickCnt, page_view: viewCnt, page_stay: stayCnt, rec_view: recViewCnt },
          behavior_count: clickCnt + viewCnt + stayCnt + recViewCnt,
          behavior_users: users,
          ctr,
          hot_top: hotRows,
        });
      }
    }
  }

  /** 单组去重 */
  private async dedupOne(gid: number) {
    const [rows] = await db.query(
      `SELECT f.source_id, c.recommended,
              (SELECT COUNT(*) FROM user_behaviors b WHERE b.content_id = f.source_id AND b.type = 'content_click') AS click_cnt
       FROM image_fingerprints f
       LEFT JOIN content c ON f.source_table = 'content' AND c.id = f.source_id
       WHERE f.group_id = ? AND f.source_table = 'content'`,
      [gid],
    );
    const members = rows as Array<{ source_id: number | string; recommended: number | string | null; click_cnt: number | string }>;
    if (members.length < 2) return { group_id: gid, kept: 0, removed: 0, keptId: 0 };
    // 保留：recommended=1 优先，再按点击数
    members.sort((a, b) => {
      const ra = toInt(a.recommended), rb = toInt(b.recommended);
      if (ra !== rb) return rb - ra;
      return toInt(b.click_cnt) - toInt(a.click_cnt);
    });
    const keepId = toInt(members[0].source_id);
    let removed = 0;
    for (const m of members) {
      const mid = toInt(m.source_id);
      if (mid === keepId) continue;
      if (toInt(m.recommended) === 1) {
        await db.query('UPDATE content SET recommended = 0 WHERE id = ? AND recommended = 1', [mid]);
        removed++;
      }
    }
    await db.query('UPDATE content SET recommended = 1 WHERE id = ?', [keepId]);
    return { group_id: gid, kept: 1, removed, keptId: keepId };
  }

  private async count(sql: string): Promise<number> {
    try {
      const [rows] = await db.query(sql);
      const r = (rows as Array<Record<string, unknown>>)[0];
      return toInt(r?.c ?? r?.COUNT ?? 0);
    } catch { return 0; }
  }

  private async fpCount(where: string): Promise<number> {
    try {
      const [rows] = await db.query(`SELECT COUNT(*) AS c FROM image_fingerprints ${where}`);
      const r = (rows as Array<{ c: number | string }>)[0];
      return toInt(r.c);
    } catch { return 0; }
  }
}