/**
 * 监控接口适配层（simple-hub 并入 DOO 后使用）
 *
 * 与旧 common/request.js 的区别：
 *  1. 基址走 /api/v3/monitor （同一域名同一端口，nginx 反代到 Nest）
 *  2. 登录态直接用 DOO 的 token（uni.getStorageSync('token')），不再有独立的 access/refresh
 *  3. 响应信封是 DOO 的 { code: 200, message, data }
 */
import config from './config.js';

const ROOT = `http://${config.host}:${config.port}`;
export const BASE = `${config.siteUrl}/server/api/v3/monitor`;

const K_DEVICE = 'hub_device_name';

/** 当前登录态：DOO 的 auth_token */
export function token() {
  return uni.getStorageSync('token') || '';
}

export function deviceName() {
  let n = uni.getStorageSync(K_DEVICE);
  if (!n) {
    try {
      const info = uni.getSystemInfoSync();
      n = `${info.brand || ''} ${info.model || '设备'}`.trim();
    } catch (e) {
      n = '设备';
    }
    uni.setStorageSync(K_DEVICE, n);
  }
  return n;
}

/** 未登录则跳 DOO 登录页，返回 false 让调用方中断 */
export function ensureLogin() {
  if (token()) return true;
  uni.reLaunch({ url: '/pages/auth/login' });
  return false;
}

function buildQuery(q) {
  if (!q) return '';
  const s = String(q).replace(/^\?/, '');
  return s ? `?${s}` : '';
}

async function api(method, path, data = null, opts = {}) {
  const t = token();
  const header = {
    'Content-Type': 'application/json',
    'x-device-name': encodeURIComponent(deviceName()),
    ...(opts.header || {}),
  };
  if (t) header.Authorization = `Bearer ${t}`;

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE + path,
      method,
      data: data || undefined,
      header,
      timeout: opts.timeout || 15000,
      success: (res) => {
        const body = res.data || {};
        // DOO 信封：code=200 视为成功
        if (res.statusCode >= 200 && res.statusCode < 300 && Number(body.code) === 200) {
          resolve(body.data === undefined ? null : body.data);
          return;
        }
        if (res.statusCode === 401 || Number(body.code) === 401) {
          uni.removeStorageSync('token');
          uni.reLaunch({ url: '/pages/auth/login' });
          reject(new Error(body.message || '登录已失效，请重新登录'));
          return;
        }
        reject(new Error(body.message || `请求失败(${res.statusCode})`));
      },
      fail: (e) => reject(new Error((e && e.errMsg) || '网络异常')),
    });
  });
}

export const get = (p, q) => api('GET', p + buildQuery(q));
export const post = (p, d, o) => api('POST', p, d, o);
export const put = (p, d, o) => api('PUT', p, d, o);

/* ---------- 总览 / 探活 ---------- */
export const fetchOverview = () => get('/overview');
export const fetchServices = () => get('/services');
export const probeServices = () => post('/services/probe', {});
/** 单个服务的历史采样（默认近 24 小时，后端按 60s 一次落库） */
export const fetchServiceHistory = (id, hours = 24) => get(`/services/${id}/history`, `hours=${hours}`);

/* ---------- 告警 ---------- */
export const fetchAlerts = (limit = 50, since) =>
  get('/alerts', `limit=${limit}${since ? `&since=${encodeURIComponent(since)}` : ''}`);
export const fetchAlertStats = (days = 7) => get('/alerts/stats', `days=${days}`);
export const fetchAlertChannels = () => get('/alerts/channels');
export const fetchAlertDetail = (id) => get(`/alerts/${id}`);
export const setAlertVerdict = (id, action) => post(`/alerts/${id}/verdict`, { action });

/* ---------- 仪表板（后端代理 Grafana，凭证不出服务端） ---------- */
export const fetchDashboard = () => get('/dashboard');

/* ---------- 主机详情：网口 / 端口 / 日志 ---------- */
export const fetchHostDetail = (host) => get(`/hosts/${encodeURIComponent(host)}/detail`);
export const fetchHostLogs = (host, lines = 120, src = 'all') =>
  get(`/hosts/${encodeURIComponent(host)}/logs`, `lines=${lines}&src=${src}`);
export const fetchHostOutages = (host, days = 7) =>
  get(`/hosts/${encodeURIComponent(host)}/outages`, `days=${days}`);

/* ---------- 设备 / 设置 ---------- */
export const fetchDevices = () => get('/devices');
export const fetchPushSettings = () => get('/settings/push');
export const savePushSettings = (patch) => put('/settings/push', patch);

/** 告警图片：库里存的是 /doo/server/uploads/hub/... 这种站点绝对路径 */
export function imageUrl(p) {
  if (!p) return '';
  const s = String(p);
  if (/^https?:\/\//i.test(s)) return s;
  return ROOT + (s.startsWith('/') ? s : `/${s}`);
}
