import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { growthFromCounts, levelFromGrowth } from '../../level';
import { HttpFail, toInt } from '../auth/auth.service';

/** 轮播图片 URL 规范化（复刻 get_carousels.php normalizeCarouselImage） */
function normalizeCarouselImage(url: string): string {
  url = (url || '').trim();
  if (!url) return url;
  if (url.startsWith('//')) url = 'https:' + url;
  if (url.includes('//doo/')) url = url.replace(/([^:])[/]{2}doo\//g, '$1/doo/');
  return url;
}

/** 极简 strip_tags：去除 HTML 标签（复刻 PHP strip_tags 用于摘要） */
function stripTags(src: string): string {
  return String(src || '').replace(/<[^>]*>/g, '');
}

@Injectable()
export class ContentService {
  async siteInfo(host: string) {
    const readSetting = async (key: string, fallback = '') => {
      try {
        const [rows] = await db.query('SELECT svalue FROM api_settings WHERE skey = ?', [key]);
        const r = rows as Array<{ svalue: string | null }>;
        return r.length && r[0].svalue != null ? String(r[0].svalue) : fallback;
      } catch { return fallback; }
    };

    // 与 PHP 一致：确保 api_settings 表存在
    await db.query(
      'CREATE TABLE IF NOT EXISTS api_settings (skey VARCHAR(50) PRIMARY KEY, svalue VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    ).catch(() => {});

    const baseUrl = host ? `http://${host}/doo` : '';
    return ok('成功', {
      site_name: await readSetting('site_name', 'DOO'),
      site_desc: await readSetting('site_desc', ''),
      logo_url: await readSetting('logo_url', ''),
      api_version: String(process.env.API_VERSION || '1.0.0'),
      service_url: baseUrl,
    });
  }

  async carousels() {
    const [rows] = await db.query(
      'SELECT id, title, author, image_url as image, sort_order as sort, link_type, link_id, link_url FROM carousels WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    const list = (rows as Array<Record<string, unknown>>).map((row) => ({
      id: row.id,
      title: row.title,
      author: row.author,
      image: normalizeCarouselImage(String(row.image ?? '')),
      sort: row.sort,
      link_type: row.link_type ?? 'none',
      link_id: toInt(row.link_id),
      link_url: row.link_url ?? '',
    }));
    return ok('获取成功', list);
  }

  async articles(limit: number, offset: number, category: string) {
    const cat = category.trim();
    const useCat = cat !== '' && cat !== 'all';
    const params: unknown[] = [];
    let where = '';
    if (useCat) {
      where = ' WHERE (a.tags LIKE ? OR a.tags = ?)';
      params.push(cat + ',%', cat);
    }

    const sql =
      'SELECT a.*, u.avatar AS author_avatar, u.role AS author_role, u.level AS manual_level, ' +
      'u.online_seconds AS author_online, ' +
      '(SELECT COUNT(*) FROM articles a2 WHERE a2.user_id = a.user_id) AS author_count, ' +
      '(SELECT COUNT(*) FROM comments c WHERE c.user_id = a.user_id AND c.status = 0 AND CHAR_LENGTH(c.content) >= 10) AS author_comments ' +
      'FROM articles a LEFT JOIN users u ON a.user_id = u.id' + where +
      ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    const listParams = [...params, limit, offset];
    const [rows] = await db.query(sql, listParams);

    const articles = (rows as Array<Record<string, unknown>>).map((art) => {
      const posts = toInt(art.author_count);
      const comments = toInt(art.author_comments);
      const online = toInt(art.author_online);
      const manual = toInt(art.manual_level);
      const growth = growthFromCounts(posts, comments, online);
      const a: Record<string, unknown> = { ...art };
      a.author_level = manual > 0 ? Math.min(10, manual) : levelFromGrowth(growth);
      delete a.manual_level;
      delete a.author_online;
      delete a.author_comments;
      return a;
    });

    // 总数
    const countSql = useCat
      ? 'SELECT COUNT(*) AS c FROM articles WHERE (tags LIKE ? OR tags = ?)'
      : 'SELECT COUNT(*) AS c FROM articles';
    const [crows] = await db.query(countSql, useCat ? [cat + ',%', cat] : []);
    const total = toInt((crows as Array<{ c: string | number }>)[0].c);

    // 分类统计（tags 首个标签）
    const catSql =
      'SELECT SUBSTRING_INDEX(tags, ",", 1) AS cat_name, COUNT(*) AS count FROM articles ' +
      "WHERE tags IS NOT NULL AND tags != '' GROUP BY cat_name ORDER BY count DESC";
    const [catRows] = await db.query(catSql);
    const categories = (catRows as Array<{ cat_name: string | null; count: number }>).map((r) => ({
      cat_name: r.cat_name,
      count: toInt(r.count),
    }));

    // 后处理：tags 数组 + cat + date + excerpt
    for (const a of articles) {
      const tagsRaw = String(a.tags ?? '');
      if (tagsRaw) {
        const arr = tagsRaw.split(',');
        a.tags = arr;
        a.cat = arr[0];
      } else {
        a.tags = [];
        a.cat = '';
      }
      const created = String(a.created_at ?? '');
      a.date = created.slice(0, 10);
      a.excerpt = stripTags(String(a.content ?? '')).slice(0, 100) + '...';
    }

    return ok('获取文章列表成功', {
      articles,
      total,
      limit,
      offset,
      categories,
    });
  }

  async contentCreate(body: Record<string, unknown>) {
    const title = body?.title ? String(body.title) : '';
    const userId = toInt(body?.user_id);
    if (!title || !userId) return new HttpFail(400, '缺少必要的参数');

    const content = body?.content != null ? String(body.content) : '';
    const imageUrl = body?.image_url != null ? String(body.image_url) : '';
    const videoUrl = body?.video_url != null ? String(body.video_url) : '';
    const tags = body?.tags != null ? String(body.tags) : '';
    const category = body?.category != null ? String(body.category) : 'photography';
    const status = body?.status != null ? String(body.status) : 'published';

    const [ins] = await db.query(
      'INSERT INTO content (user_id, title, content, image_url, video_url, tags, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, content, imageUrl, videoUrl, tags, category, status],
    );
    const id = toInt((ins as { insertId?: number }).insertId);
    const [rows] = await db.query('SELECT * FROM content WHERE id = ?', [id]);
    return { message: '创建内容成功', code: 201, data: (rows as unknown[])[0] || null };
  }

  async contentGet(id: number) {
    if (id <= 0) return new HttpFail(400, '缺少内容ID');
    const [rows] = await db.query(
      'SELECT c.*, u.username AS author FROM content c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [id],
    );
    const row = (rows as unknown[])[0];
    if (!row) return new HttpFail(404, '内容不存在');
    return ok('获取内容成功', row);
  }

  async contentList(limit: number, offset: number, status: string) {
    const [rows] = await db.query(
      'SELECT c.*, u.username AS author FROM content c LEFT JOIN users u ON c.user_id = u.id WHERE c.status = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?',
      [status, limit, offset],
    );
    const [cnt] = await db.query('SELECT COUNT(*) AS c FROM content WHERE status = ?', [status]);
    const total = toInt((cnt as Array<{ c: number | string }>)[0].c);
    return ok('获取内容列表成功', { contents: rows, total, limit, offset });
  }

  async contentUpdate(id: number, body: Record<string, unknown>) {
    if (id <= 0) return new HttpFail(400, '缺少内容ID');
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      title: 'title', content: 'content', image_url: 'image_url', video_url: 'video_url',
      likes: 'likes', comments: 'comments', status: 'status', tags: 'tags', category: 'category',
    };
    for (const [k, col] of Object.entries(map)) {
      if (body[k] !== undefined && body[k] !== null) {
        fields.push(`${col} = ?`);
        params.push(String(body[k]));
      }
    }
    if (!fields.length) return new HttpFail(400, '没有需要更新的字段');
    params.push(id);
    await db.query(`UPDATE content SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await db.query('SELECT * FROM content WHERE id = ?', [id]);
    return ok('更新内容成功', (rows as unknown[])[0] || null);
  }

  async contentDelete(id: number) {
    if (id <= 0) return new HttpFail(400, '缺少内容ID');
    const [chk] = await db.query('SELECT id FROM content WHERE id = ?', [id]);
    if (!(chk as unknown[]).length) return new HttpFail(404, '内容不存在');
    await db.query('DELETE FROM content WHERE id = ?', [id]);
    return ok('删除内容成功');
  }

  error(code: number, message: string) {
    return fail(code, message);
  }
}