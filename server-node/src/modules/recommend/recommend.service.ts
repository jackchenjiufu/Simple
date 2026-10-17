import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt } from '../auth/auth.service';

/** 简单内存缓存（复刻 PHP Cache::remember，600s） */
const cacheMap = new Map<string, { expire: number; value: unknown }>();
function cacheRemember<T>(key: string, ttl: number, fn: () => T): T {
  const now = Date.now();
  const hit = cacheMap.get(key);
  if (hit && hit.expire > now) return hit.value as T;
  const value = fn();
  cacheMap.set(key, { expire: now + ttl * 1000, value });
  // 防内存膨胀：超过 500 条清掉过期项
  if (cacheMap.size > 500) {
    cacheMap.forEach((v, k) => { if (v.expire <= now) cacheMap.delete(k); });
  }
  return value;
}

/**
 * 清推荐缓存（复刻 PHP Cache::forget 对 recommend:* 的清除）
 * admin_recommend 的 pin/toggle/save_algo_config 等写操作后调用，
 * 否则 App 端推荐流最多 600s 不更新（曾因空实现导致置顶/移出池不生效）。
 */
export function clearRecommendCache(): void {
  const now = Date.now();
  for (const k of cacheMap.keys()) {
    if (k.startsWith('recommend:')) cacheMap.delete(k);
  }
  void now;
}

interface AlgoSettings {
  w_cb: number; w_cf: number; w_itemcf: number; w_hot: number;
  total_need: number; decay_days: number;
  w_click: number; w_stay_max: number; w_view: number;
  explore_cold: number; explore_grow: number; explore_mature: number;
}

const ALGO_DEFAULTS: AlgoSettings = {
  w_cb: 0.4, w_cf: 0.2, w_itemcf: 0.2, w_hot: 0.2,
  total_need: 50, decay_days: 30,
  w_click: 10, w_stay_max: 5, w_view: 1,
  explore_cold: 0.5, explore_grow: 0.35, explore_mature: 0.2,
};

@Injectable()
export class RecommendService {
  /** GET /recommend_images —— 融合推荐（0.4CB+0.2UserCF+0.2ItemCF+0.2Hot） */
  async images(limitParam: number, userId: number, scope: string) {
    const limit = limitParam > 0 ? limitParam : 0;
    const allScope = scope === 'all';
    const algo = await this.algoSettings();
    const cacheKey = `recommend:images:${userId > 0 ? userId : 'anon'}:${limit}:${scope}:${JSON.stringify(algo)}`;

    const imageWhere =
      `c.image_url != '' AND c.status = 'published' AND c.recommended = 1 ` +
      `AND (c.moderation_status IS NULL OR c.moderation_status NOT IN ('blocked','unsafe'))` +
      (allScope ? '' : ` AND c.source = 'doo'`);
    const needLimit = limit > 0 ? limit : 100000;
    const needCand = Math.min(100000, needLimit * 2);

    // 指纹组（600s 缓存）
    const groupMap = cacheRemember('recommend:imgfp:groupmap', 600, async () => {
      const [rows] = await db.query(
        "SELECT source_id, group_id FROM image_fingerprints WHERE source_table = 'content' AND group_id > 0",
      );
      const map: Record<number, number> = {};
      for (const r of rows as Array<{ source_id: number | string; group_id: number | string }>) {
        map[toInt(r.source_id)] = toInt(r.group_id);
      }
      return map;
    }) as Promise<Record<number, number>>;
    const gm = await groupMap;

    const result = (await cacheRemember(cacheKey, 600, async () => {
      if (userId > 0) {
        const profile = await this.buildUserProfile(userId, algo);
        if (Object.keys(profile.cats).length || profile.clickedIds.length) {
          const candidates = await this.recommendCandidates(userId, profile, needCand, imageWhere);
          if (candidates.length >= 3) {
            const ranked = await this.rankCandidates(candidates, profile, userId, gm, algo, needLimit);
            return { type: 'personal', title: '为你推荐', items: ranked.slice(0, needLimit) };
          }
        }
      }

      // ── 2. 热门 ──
      const [hotRows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name,
                COALESCE(t.cnt, 0) AS click_cnt
         FROM content c
         LEFT JOIN users u ON u.id = c.user_id
         LEFT JOIN (SELECT content_id, COUNT(*) AS cnt FROM user_behaviors WHERE type = 'content_click' GROUP BY content_id) t ON t.content_id = c.id
         WHERE ${imageWhere}
         ORDER BY click_cnt DESC, c.id DESC LIMIT ${needLimit}`,
      );
      let hasClick = false;
      for (const r of hotRows as Array<{ click_cnt: number | string }>) {
        if (toInt(r.click_cnt) > 0) { hasClick = true; break; }
      }
      if (hasClick) {
        const seenGroup: Record<number, boolean> = {};
        const hotDedup: unknown[] = [];
        for (const r of hotRows as Array<{ id: number | string }>) {
          const g = gm[toInt(r.id)] || 0;
          if (g > 0 && seenGroup[g]) continue;
          if (g > 0) seenGroup[g] = true;
          hotDedup.push(r);
        }
        return { type: 'hot', title: '热门图片', items: hotDedup };
      }

      // ── 3. 最新兜底 ──
      const [latestRows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name
         FROM content c LEFT JOIN users u ON u.id = c.user_id
         WHERE ${imageWhere} ORDER BY c.id DESC LIMIT ${needLimit}`,
      );
      return { type: 'latest', title: '最新图片', items: latestRows };
    })) as { type: string; title: string; items: unknown[] };

    // ── 置顶主推：is_pinned=1 强制最前 ──
    if (result && Array.isArray(result.items)) {
      const [pinRows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name,
                COALESCE(t.cnt, 0) AS click_cnt
         FROM content c
         LEFT JOIN users u ON u.id = c.user_id
         LEFT JOIN (SELECT content_id, COUNT(*) AS cnt FROM user_behaviors WHERE type = 'content_click' GROUP BY content_id) t ON t.content_id = c.id
         WHERE ${imageWhere} AND c.is_pinned = 1
         ORDER BY c.pin_time DESC, c.id DESC`,
      );
      const pinnedRows = pinRows as Array<{ id: number | string }>;
      if (pinnedRows.length) {
        const pinnedIds: Record<number, boolean> = {};
        const finalItems: unknown[] = [];
        for (const p of pinnedRows) { pinnedIds[toInt(p.id)] = true; finalItems.push(p); }
        for (const it of result.items) {
          if (!pinnedIds[toInt((it as { id: number | string }).id)]) finalItems.push(it);
        }
        result.items = finalItems.slice(0, needLimit);
      }
    }

    return ok('成功', result);
  }

  /** 用户画像：近 365 天行为加权 x 时间衰减 */
  private async buildUserProfile(userId: number, algo: AlgoSettings) {
    const wClick = algo.w_click;
    const wStayMax = algo.w_stay_max;
    const wView = algo.w_view;
    const decayDays = Math.max(1, algo.decay_days);
    const windowMs = (Math.floor(Date.now() / 1000) - 365 * 86400) * 1000;

    const [rows] = await db.query(
      `SELECT b.type, b.content_id, b.duration, b.timestamp,
              COALESCE(c.category, i.category) AS category,
              COALESCE(c.tags, i.tags) AS tags
       FROM user_behaviors b
       LEFT JOIN content c ON c.id = b.content_id
       LEFT JOIN images i ON i.id = b.content_id
       WHERE b.user_id = ? AND b.timestamp > ? AND b.content_id > 0
       ORDER BY b.timestamp DESC LIMIT 300`,
      [userId, windowMs],
    );

    const cats: Record<string, number> = {};
    const tagSet: Record<string, boolean> = {};
    const clicked: Record<number, boolean> = {};
    const now = Math.floor(Date.now() / 1000);

    for (const row of rows as Array<{
      type: string; content_id: number | string; duration: number | string; timestamp: number | string;
      category: string | null; tags: string | null;
    }>) {
      let w = wView;
      if (row.type === 'content_click') w = wClick;
      else if (row.type === 'page_stay') w = Math.min(wStayMax, Math.max(1, toInt(row.duration) / 60));
      const cid = toInt(row.content_id);
      if (cid > 0) clicked[cid] = true;
      const days = (now - toInt(row.timestamp) / 1000) / 86400;
      if (days > 0) w *= Math.exp(-days / decayDays);
      if (row.category) cats[row.category] = (cats[row.category] || 0) + w;
      for (const t of String(row.tags || '').split(',')) {
        const tt = t.trim();
        if (tt) tagSet[tt] = true;
      }
    }

    return { cats, tags: Object.keys(tagSet), clickedIds: Object.keys(clicked).map(Number) };
  }

  /** 候选集：画像分类 + UserCF + ItemCF + 探索 + 热门补足 */
  private async recommendCandidates(
    userId: number,
    profile: { cats: Record<string, number>; tags: string[]; clickedIds: number[] },
    need: number,
    imageWhere: string,
  ) {
    const candidates: Array<Record<string, unknown>> = [];
    const seenIds: Record<number, boolean> = {};

    const push = (r: Record<string, unknown>) => {
      const id = toInt(r.id);
      if (seenIds[id]) return;
      seenIds[id] = true;
      candidates.push(r);
    };

    // A. 画像偏好分类
    const catKeys = Object.keys(profile.cats);
    if (catKeys.length) {
      const ph = catKeys.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name
         FROM content c LEFT JOIN users u ON u.id = c.user_id
         WHERE ${imageWhere} AND c.category IN (${ph})
         ORDER BY c.id DESC LIMIT ${need}`,
        catKeys,
      );
      for (const r of rows as Array<Record<string, unknown>>) push(r);
    }

    // B. UserCF：相似用户点击过
    const simUsers = await this.similarUsers(userId, 3);
    if (simUsers.length) {
      const ph = simUsers.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name,
                COUNT(*) AS sim_cnt
         FROM user_behaviors b
         JOIN content c ON c.id = b.content_id
         LEFT JOIN users u ON u.id = c.user_id
         WHERE b.user_id IN (${ph}) AND b.type = 'content_click' AND ${imageWhere}
         GROUP BY c.id ORDER BY sim_cnt DESC LIMIT ${need}`,
        simUsers,
      );
      for (const r of rows as Array<Record<string, unknown>>) { r.sim_cnt = toInt(r.sim_cnt); push(r); }
    }

    // D. ItemCF：共现相似物品
    const itemcfMap = await this.itemSimilarItems(profile.clickedIds, 30);
    const itemcfKeys = Object.keys(itemcfMap).map(Number);
    if (itemcfKeys.length) {
      const ph = itemcfKeys.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name
         FROM content c LEFT JOIN users u ON u.id = c.user_id
         WHERE ${imageWhere} AND c.id IN (${ph})`,
        itemcfKeys,
      );
      for (const r of rows as Array<Record<string, unknown>>) { r.itemcf_cnt = itemcfMap[toInt(r.id)]; push(r); }
    }

    // E. 探索通道：非画像类别，每类最多 2 条
    if (catKeys.length && catKeys.length < 15) {
      const ph = catKeys.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name
         FROM content c LEFT JOIN users u ON u.id = c.user_id
         WHERE ${imageWhere} AND (c.category NOT IN (${ph}) OR c.category IS NULL OR c.category = '')
         ORDER BY c.id DESC LIMIT ${need}`,
        catKeys,
      );
      const exploreByCat: Record<string, number> = {};
      for (const r of rows as Array<Record<string, unknown>>) {
        const id = toInt(r.id);
        if (seenIds[id]) continue;
        const cat = String(r.category || '_none');
        if ((exploreByCat[cat] || 0) >= 2) continue;
        exploreByCat[cat] = (exploreByCat[cat] || 0) + 1;
        seenIds[id] = true;
        r.explore = 1;
        candidates.push(r);
      }
    }

    // C. 不足补热门（排除已见）
    if (candidates.length < need) {
      const exclude = Object.keys(seenIds).length ? Object.keys(seenIds).join(',') : '0';
      const [rows] = await db.query(
        `SELECT c.id, c.title, c.image_url, c.video_url, c.category, c.tags, c.created_at, u.nickname AS author_name
         FROM content c LEFT JOIN users u ON u.id = c.user_id
         WHERE ${imageWhere} AND c.id NOT IN (${exclude})
         ORDER BY c.id DESC LIMIT ${need - candidates.length}`,
      );
      for (const r of rows as Array<Record<string, unknown>>) candidates.push(r);
    }

    return candidates;
  }

  /** 相似用户：行为交集 TOP-N */
  private async similarUsers(userId: number, n: number): Promise<number[]> {
    const [rows] = await db.query(
      `SELECT b2.user_id, COUNT(DISTINCT b2.content_id) cnt
       FROM user_behaviors b1
       JOIN user_behaviors b2 ON b2.content_id = b1.content_id AND b2.user_id != b1.user_id
       WHERE b1.user_id = ? AND b1.type = 'content_click' AND b2.type = 'content_click'
       GROUP BY b2.user_id ORDER BY cnt DESC LIMIT ${n}`,
      [userId],
    );
    return (rows as Array<{ user_id: number | string }>).map((r) => toInt(r.user_id));
  }

  /** ItemCF：共现相似物品 map */
  private async itemSimilarItems(clickedIds: number[], n: number): Promise<Record<number, number>> {
    const uniq: number[] = [];
    for (const c of clickedIds.map(Number)) { if (!uniq.includes(c)) uniq.push(c); }
    const seeds = uniq.slice(0, 50);
    if (!seeds.length) return {};
    const ph = seeds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT b2.content_id AS item_id, COUNT(DISTINCT b2.user_id) AS co_cnt
       FROM user_behaviors b1
       JOIN user_behaviors b2 ON b2.user_id = b1.user_id AND b2.type = 'content_click'
       WHERE b1.type = 'content_click' AND b1.content_id IN (${ph}) AND b2.content_id NOT IN (${ph})
       GROUP BY b2.content_id ORDER BY co_cnt DESC, b2.content_id DESC LIMIT ${n}`,
      [...seeds, ...seeds],
    );
    const map: Record<number, number> = {};
    for (const r of rows as Array<{ item_id: number | string; co_cnt: number | string }>) {
      map[toInt(r.item_id)] = toInt(r.co_cnt);
    }
    return map;
  }

  /** 融合排序：MMR 类别配额 + 同组去重 + 已看降权 */
  private async rankCandidates(
    candidates: Array<Record<string, unknown>>,
    profile: { cats: Record<string, number>; tags: string[]; clickedIds: number[] },
    userId: number,
    groupMap: Record<number, number>,
    algo: AlgoSettings,
    needLimit: number,
  ) {
    const wCb = algo.w_cb, wCf = algo.w_cf, wItemcf = algo.w_itemcf, wHot = algo.w_hot;
    let totalNeed = algo.total_need;
    if (totalNeed <= 0) totalNeed = needLimit > 0 ? needLimit : 100000;
    const exploreCold = algo.explore_cold, exploreGrow = algo.explore_grow, exploreMature = algo.explore_mature;

    const catMax = Object.keys(profile.cats).length ? Math.max(...Object.values(profile.cats)) : 1;
    const profileTags = profile.tags;
    const clickedSet: Record<number, boolean> = {};
    for (const c of profile.clickedIds) clickedSet[c] = true;
    const clickedGroups: Record<number, boolean> = {};
    for (const cid of profile.clickedIds) {
      if (groupMap[cid]) clickedGroups[groupMap[cid]] = true;
    }

    const scored: Array<{ score: number; item: Record<string, unknown>; gid: number }> = [];
    for (const c of candidates) {
      const cid = toInt(c.id);
      const viewed = !!clickedSet[cid];

      // CB
      const catW = profile.cats[String(c.category)] || 0;
      const scoreCat = catMax > 0 ? catW / catMax : 0;
      const contentTags = String(c.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const inter = contentTags.filter((t) => profileTags.includes(t)).length;
      const unionArr = contentTags.concat(profileTags.filter((t) => !contentTags.includes(t)));
      const union = unionArr.length;
      const scoreJ = union > 0 ? inter / union : 0;
      let cb = 0.7 * scoreCat + 0.3 * scoreJ;

      // 视觉偏好泛化
      const gid = groupMap[cid] || 0;
      if (gid > 0 && clickedGroups[gid]) cb = Math.min(1.0, cb + 0.3);

      // CF
      const simCnt = toInt(c.sim_cnt);
      const cf = simCnt > 0 ? Math.min(1, simCnt / 3) : 0;
      // ItemCF
      const itemcfCnt = toInt(c.itemcf_cnt);
      const itemcf = itemcfCnt > 0 ? Math.min(1, itemcfCnt / 3) : 0;
      // Hot
      const hot = toInt(c.click_cnt) > 0 ? Math.min(1, toInt(c.click_cnt) / 10) : 0;

      let score = wCb * cb + wCf * cf + wItemcf * itemcf + wHot * hot;
      if (viewed) score *= 0.2;
      scored.push({ score, item: c, gid });
    }

    scored.sort((a, b) => b.score - a.score);

    // 类别配额
    const totalBehav = Object.values(profile.cats).reduce((s, v) => s + v, 0);
    const exploreRatio = totalBehav < 30 ? exploreCold : totalBehav < 100 ? exploreGrow : exploreMature;

    const catQuota: Record<string, number> = {};
    let prefTotal = 0;
    for (const [cat, w] of Object.entries(profile.cats)) if (cat) prefTotal += w;
    let exploreSeats: number;
    if (prefTotal > 0) {
      const prefSeats = Math.floor(totalNeed * (1 - exploreRatio));
      let allocated = 0;
      for (const [cat, w] of Object.entries(profile.cats)) {
        if (!cat) continue;
        let q = Math.floor((prefSeats * w) / prefTotal);
        if (q < 1) q = 1;
        catQuota[cat] = q;
        allocated += q;
      }
      exploreSeats = totalNeed - allocated;
      if (exploreSeats < totalNeed * exploreRatio) exploreSeats = Math.ceil(totalNeed * exploreRatio);
    } else {
      exploreSeats = totalNeed;
    }

    // MMR 贪心
    const ranked: Array<Record<string, unknown>> = [];
    const usedCat: Record<string, number> = {};
    const usedGroup: Record<string, number> = {};
    const exploreUsed: Record<string, number> = {};
    const prefCatSet: Record<string, boolean> = {};
    for (const k of Object.keys(catQuota)) prefCatSet[k] = true;

    for (const s of scored) {
      if (ranked.length >= totalNeed) break;
      const cat = String(s.item.category || '');
      const isExplore = !!s.item.explore || !prefCatSet[cat];
      if (s.gid > 0 && (usedGroup[s.gid] || 0) >= 1) continue;
      if (isExplore) {
        if (exploreSeats <= 0) continue;
        if (cat && (exploreUsed[cat] || 0) >= 1) continue;
        exploreSeats--;
        if (cat) exploreUsed[cat] = 1;
      } else {
        const quota = catQuota[cat] ?? 1;
        if ((usedCat[cat] || 0) >= quota) continue;
        usedCat[cat] = (usedCat[cat] || 0) + 1;
      }
      if (s.gid > 0) usedGroup[s.gid] = (usedGroup[s.gid] || 0) + 1;
      ranked.push(s.item);
    }

    // 补足
    if (ranked.length < scored.length && ranked.length < totalNeed) {
      for (const s of scored) {
        if (ranked.length >= totalNeed) break;
        if (s.gid > 0 && (usedGroup[s.gid] || 0) >= 1) continue;
        if (ranked.some((r) => toInt(r.id) === toInt(s.item.id))) continue;
        if (s.gid > 0) usedGroup[s.gid] = (usedGroup[s.gid] || 0) + 1;
        ranked.push(s.item);
      }
    }

    return ranked;
  }

  /** 算法参数（api_settings，可后台手调） */
  private async algoSettings(): Promise<AlgoSettings> {
    try {
      const [rows] = await db.query(
        "SELECT skey, svalue FROM api_settings WHERE skey LIKE 'algo_%' OR skey IN ('recommend_w_cb','recommend_w_cf','recommend_w_itemcf','recommend_w_hot')",
      );
      const out = { ...ALGO_DEFAULTS };
      for (const r of rows as Array<{ skey: string; svalue: string | null }>) {
        let k = r.skey;
        if (k.startsWith('recommend_')) k = k.slice(10);
        if (k.startsWith('algo_')) k = k.slice(5);
        if (!(k in ALGO_DEFAULTS)) continue;
        const v = (r.svalue || '').trim();
        if (!v) continue;
        out[k as keyof AlgoSettings] = parseFloat(v);
      }
      return out;
    } catch {
      return { ...ALGO_DEFAULTS };
    }
  }
}