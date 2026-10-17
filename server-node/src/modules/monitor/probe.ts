import * as net from 'net';

/** TCP 连通性探测 */
export async function tcpCheck(host: string, port: number, ms = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port });
    const done = (ok: boolean) => {
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(ms);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

/** HTTP 健康检查：5xx 视为不可用 */
export async function httpCheck(url: string, ms = 3000): Promise<{ ok: number; status: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    return { ok: res.status < 500 ? 1 : 0, status: res.status };
  } catch {
    return { ok: 0, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
