import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../config/db';
import { HttpFail } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** .env 文件路径（env 覆盖；默认 Node 项目根 .env，与 config/env.ts loadEnv 一致） */
const ENV_FILE = process.env.ENV_FILE || path.join(__dirname, '../../../.env');

/** AI 配置读取（对应 PHP Config::get('ai.*')） */
function aiConfig() {
  return {
    base_url: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.AI_MODEL || 'deepseek-chat',
    api_key: process.env.DEEPSEEK_API_KEY || '',
    glm_base_url: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/',
    glm_vision_model: process.env.GLM_VISION_MODEL || 'glm-4v-flash',
    glm_api_key: process.env.GLM_API_KEY || '',
  };
}

/** 产品知识库 System Prompt（复刻 ai_proxy.php heredoc） */
const SYSTEM_PROMPT = `你是 Simple App（DOO 社区）官方智能客服，请基于以下产品事实回答用户问题，语气亲切专业、回答简洁（一般 3-5 句话），不要编造不存在的功能，拿不准时引导用户提交反馈或联系管理员。

【产品简介】
Simple App 是一个图片/视频分享社区，支持浏览、发布、互动、私聊，含 AI 个性化推荐、GLM 智能审核、Web 与 App 双端后台管理。桌面端（Goo）已并入同一内容池。

【功能总览】
1. 首页：瀑布流展示图片/视频（带播放角标的卡片为视频），顶部轮播、公告条、分类切换；另有文章资讯 Tab 与智能客服 Tab。
2. AI 推荐：融合内容匹配（CB）+相似用户（UserCF）+物品协同（ItemCF）+热度加权，学习点击/停留/浏览行为，越用越准；管理员可后台手调权重；管理员置顶的内容排所有用户推荐流最前。
3. 内容发布：支持上传图片和视频、发布图文文章；发布后由 GLM AI 自动打标签分类、自动安全审核（色情/暴力/血腥/政治/广告/其他等违规内容自动下架，人工可复审）。
4. 互动：点赞、收藏、评论（发表/回复/管理员置顶/举报）、举报违规内容、浏览记录。
5. 私信：用户之间可私聊（会话列表+聊天页）。
6. 账号：注册/登录、找回密码（绑定邮箱收重置邮件）、修改密码、个人资料编辑、用户等级成长体系（行为积累成长值）、注销账号。
7. 文章：图文资讯，带评论区。
8. 热搜榜：自动抓取微博/抖音/知乎/头条/小红书/黑客新闻/国际新闻等热点。
9. 公告与轮播：管理员发布公告、配置首页轮播；启动页也可由管理员后台配置。
10. 版本更新：设置-检查更新，自动下载安装新版本（含热更新）。
11. 反馈：我的-反馈提交问题/建议，AI 自动回复，重要问题转后台人工处理。

【常见问题速答】
- 上传的图片为什么没出现在推荐流？需通过 GLM 安全审核且进入推荐池；违规内容自动下架。
- 如何置顶内容？管理员在「内容管理」或「内容推荐」点置顶，置顶内容所有用户推荐流最前。
- 评论能置顶吗？管理员可以在评论区/评论管理置顶评论。
- 推荐不准怎么办？多浏览、点赞、收藏感兴趣的内容，算法会学习；管理员可后台调权重。
- 视频怎么播放？点击首页带播放角标的卡片，进入播放页观看，支持评论互动。
- 如何反馈问题？「我的-反馈」提交，AI 自动回复，管理员后台处理。
- 如何更新版本？设置-检查更新，按提示下载安装。
- 忘记密码？登录页「忘记密码」走找回流程（绑定邮箱收重置邮件）。
- 能私聊吗？可以，用户主页或头像可发起私聊。
- 内容审核是什么机制？GLM AI 自动审核（色情/暴力/血腥/政治/广告等），违规自动拦截，人工可复审。

【回答规范】
- 只回答与 Simple App 相关的问题；无关问题礼貌说明只服务本产品。
- 不知道的明确说「暂不支持该功能/请提交反馈」，不要编造。
- 涉及账号操作（改邮箱、删数据等）只给引导话术，不声称已执行。`;

/** POST JSON 请求（对应 curl_setopt_array，超时用 AbortController 模拟 CURLOPT_TIMEOUT） */
async function postJson(
  url: string,
  headers: Record<string, string>,
  payload: unknown,
  timeoutMs: number,
): Promise<{ httpCode: number; error: string; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    const text = await resp.text();
    return { httpCode: resp.status, error: '', text };
  } catch (e) {
    return { httpCode: 0, error: (e as Error).message, text: '' };
  } finally {
    clearTimeout(timer);
  }
}

/** 下载图片（对应 curl + CURLOPT_FOLLOWLOCATION；fetch 默认跟随重定向） */
async function fetchBuffer(
  url: string,
  timeoutMs: number,
): Promise<{ httpCode: number; buffer: Buffer }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    const buf = Buffer.from(await resp.arrayBuffer());
    return { httpCode: resp.status, buffer: buf };
  } catch {
    return { httpCode: 0, buffer: Buffer.alloc(0) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AI 代理（复刻 ai_proxy.php）
 * POST /ai_proxy —— action: chat（默认，公开）| get_config | save_config | test（后三者需管理员鉴权）
 * 注意：PHP 原文件所有分支均未设置 http_response_code（一律 HTTP 200，code 在 body 内），
 *       因此本服务错误分支全部返回普通对象而非 HttpFail。
 */
@Injectable()
export class AdminAiService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** POST /ai_proxy —— AI 聊天代理 / 配置管理 */
  async handle(
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ) {
    const action = body?.action !== undefined ? String(body.action) : 'chat';

    // 管理功能需管理员权限（Session / Token 双模式统一鉴权，兼容后台 token 免登录流）
    if (['get_config', 'save_config', 'test'].includes(action)) {
      const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
      if (auth instanceof HttpFail) return auth;
    }

    switch (action) {
      case 'get_config': {
        // 返回明文 Chat Key/GLM Key
        const cfg = aiConfig();
        return {
          code: 200,
          data: {
            base_url: cfg.base_url,
            model: cfg.model,
            api_key: cfg.api_key,
            glm_base_url: cfg.glm_base_url,
            glm_vision_model: cfg.glm_vision_model,
            glm_api_key: cfg.glm_api_key,
          },
        };
      }

      case 'save_config': {
        if (!fs.existsSync(ENV_FILE)) {
          return { code: 500, message: '.env 文件不存在' };
        }
        const cfg = aiConfig();
        const baseUrl = String(body.base_url ?? '').trim();
        const model = String(body.model ?? '').trim();
        const apiKey = String(body.api_key ?? '').trim();
        const glmBaseUrl = String(body.glm_base_url ?? '').trim();
        const glmModel = String(body.glm_vision_model ?? '').trim();
        const glmApiKey = String(body.glm_api_key ?? '').trim();

        // 对照明文存储值：仅当新值与当前值不同才替换（api_key/glm_api_key 特殊处理）
        const replacements: Record<string, string> = {};
        if (baseUrl) replacements['DEEPSEEK_BASE_URL'] = baseUrl;
        if (model) replacements['AI_MODEL'] = model;
        if (apiKey && apiKey !== cfg.api_key) replacements['DEEPSEEK_API_KEY'] = apiKey;
        if (glmBaseUrl) replacements['GLM_BASE_URL'] = glmBaseUrl;
        if (glmModel) replacements['GLM_VISION_MODEL'] = glmModel;
        if (glmApiKey && glmApiKey !== cfg.glm_api_key) replacements['GLM_API_KEY'] = glmApiKey;

        // 逐行处理（FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES），仅替换已存在的 KEY= 行
        const lines = fs
          .readFileSync(ENV_FILE, 'utf8')
          .split(/\r?\n/)
          .filter((l) => l !== '');
        const updated: string[] = [];
        let changed = false;
        for (const line of lines) {
          let written = false;
          for (const [key, val] of Object.entries(replacements)) {
            if (line.startsWith(key + '=')) {
              if (val !== '') {
                updated.push(key + '=' + val);
                changed = true;
              }
              written = true;
              break;
            }
          }
          if (!written) updated.push(line);
        }
        if (changed) {
          fs.writeFileSync(ENV_FILE, updated.join('\n') + '\n');
          // 同步到 process.env（对应 PHP Config::init() 的重新加载意图，使 get_config 立即生效）
          for (const [key, val] of Object.entries(replacements)) {
            if (val !== '') process.env[key] = val;
          }
        }
        return { code: 200, message: '配置已保存' };
      }

      case 'test': {
        const mode = body.mode !== undefined ? String(body.mode) : 'chat';
        const cfg = aiConfig();

        if (mode === 'vision') {
          // ── GLM 识图测试：用 GLM-4V 识别一张图 ──
          const testKey =
            body.glm_api_key !== undefined ? String(body.glm_api_key) : cfg.glm_api_key;
          const testBase =
            body.glm_base_url !== undefined ? String(body.glm_base_url) : cfg.glm_base_url;
          const testModel =
            body.glm_vision_model !== undefined ? String(body.glm_vision_model) : cfg.glm_vision_model;
          if (!testKey) return { code: 400, message: '未配置 GLM API Key' };

          // 测试图：优先用传入 image_url，否则取推荐池第一张图
          let imageUrl = String(body.image_url ?? '').trim();
          if (imageUrl === '') {
            try {
              const [rows] = await db.query(
                "SELECT image_url FROM content WHERE image_url != '' AND recommended = 1 ORDER BY id DESC LIMIT 1",
              );
              const r = (rows as Array<{ image_url?: string | null }>)[0];
              imageUrl = r && r.image_url ? String(r.image_url) : '';
            } catch { imageUrl = ''; }
          }
          if (imageUrl === '') {
            return { code: 400, message: '无可用测试图（请先上传图片内容）' };
          }

          const img = await fetchBuffer(imageUrl, 20000);
          if (img.httpCode !== 200) {
            return { code: 500, message: '测试图下载失败 HTTP ' + img.httpCode };
          }

          let ext = '';
          try {
            ext = (new URL(imageUrl).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
          } catch { ext = ''; }
          const mime = ['png', 'gif', 'webp'].includes(ext) ? 'image/' + ext : 'image/jpeg';
          const b64 = img.buffer.toString('base64');

          const res = await postJson(
            testBase.replace(/\/+$/, '') + '/chat/completions',
            { 'Content-Type': 'application/json', Authorization: 'Bearer ' + testKey },
            {
              model: testModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } },
                    { type: 'text', text: '用一句话描述这张图片的内容' },
                  ],
                },
              ],
              max_tokens: 60,
            },
            60000,
          );

          if (res.httpCode === 200) {
            let reply = '';
            try {
              const j = JSON.parse(res.text);
              reply = String(j?.choices?.[0]?.message?.content ?? '').trim();
            } catch { reply = ''; }
            return { code: 200, message: '连接成功！', data: { glm_reply: reply } };
          }
          return {
            code: 500,
            message: '连接失败：' + (res.error || 'HTTP ' + res.httpCode) + ' ' + res.text.slice(0, 150),
          };
        }

        // ── Chat 测试（DeepSeek 兼容）──
        const testKey = body.api_key !== undefined ? String(body.api_key) : cfg.api_key;
        const testBase = body.base_url !== undefined ? String(body.base_url) : cfg.base_url;
        const testModel = body.model !== undefined ? String(body.model) : cfg.model;
        if (!testKey) return { code: 400, message: '未配置 API Key' };

        const res = await postJson(
          testBase + '/chat/completions',
          { 'Content-Type': 'application/json', Authorization: 'Bearer ' + testKey },
          { model: testModel, messages: [{ role: 'user', content: 'Hi' }], max_tokens: 10 },
          15000,
        );
        if (res.httpCode === 200) return { code: 200, message: '连接成功！' };
        return { code: 500, message: '连接失败：' + (res.error || 'HTTP ' + res.httpCode) };
      }

      default: {
        // ── Chat（默认 action）：产品知识库智能客服 ──
        const msg = body.message !== undefined ? String(body.message) : '';
        if (!msg) return { code: 400, message: '请输入问题' };

        const cfg = aiConfig();
        if (!cfg.api_key) return { code: 500, message: 'AI 服务未配置' };

        const res = await postJson(
          cfg.base_url + '/chat/completions',
          { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.api_key },
          {
            model: cfg.model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: msg },
            ],
            max_tokens: 500,
            temperature: 0.7,
          },
          90000,
        );

        if (res.httpCode !== 200) {
          return { code: 500, message: 'AI 服务请求失败', debug: res.error || 'HTTP ' + res.httpCode };
        }
        let reply = '';
        try {
          const j = JSON.parse(res.text);
          reply = String(j?.choices?.[0]?.message?.content ?? '');
        } catch { reply = ''; }
        return { code: 200, data: { reply } };
      }
    }
  }
}
