/**
 * DOO WebSocket 推送服务 (Node.js 版)
 * 替代 PHP Workerman 版，更稳定
 */
const WebSocket = require('ws');
const mysql = require('mysql2/promise');

const WS_PORT = 1884;
const PING_INTERVAL = 5000; // 5秒心跳

const userConnections = new Map(); // userId => ws
const pendingMessages = new Map(); // userId => [messages]

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '320722',
    database: 'doo-app',
    charset: 'utf8mb4'
};

const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws, req) => {
    ws.userId = null;
    ws.alive = true;

    // 心跳检测
    ws.on('pong', () => { ws.alive = true; });

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());
            handleMessage(ws, msg);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'invalid message' }));
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            console.log(`[断开] userId=${ws.userId}`);
            userConnections.delete(ws.userId);
        }
    });

    ws.on('error', (err) => {
        console.log(`[错误] ${err.message}`);
    });
});

// 定时心跳检测
const pingTimer = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.alive === false) {
            console.log(`[超时] 关闭无响应连接`);
            ws.terminate();
            return;
        }
        ws.alive = false;
        ws.ping();
    });
}, PING_INTERVAL);

wss.on('close', () => clearInterval(pingTimer));

async function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'auth':
            const userId = String(msg.userId || '');
            if (!userId) {
                ws.send(JSON.stringify({ type: 'auth_result', success: false }));
                return;
            }
            // 踢掉旧连接
            const old = userConnections.get(userId);
            if (old && old !== ws) {
                old.send(JSON.stringify({ type: 'kick' }));
                old.close();
            }
            userConnections.set(userId, ws);
            ws.userId = userId;
            ws.send(JSON.stringify({ type: 'auth_result', success: true }));
            console.log(`[认证] userId=${userId} 连接成功`);

            // 发送待发消息
            const pending = pendingMessages.get(userId);
            if (pending && pending.length) {
                pending.forEach(m => ws.send(m));
                pendingMessages.delete(userId);
            }

            // 发送最新公告
            try {
                const conn = await mysql.createConnection(dbConfig);
                const [rows] = await conn.execute(
                    'SELECT title, content FROM announcements ORDER BY id DESC LIMIT 3'
                );
                for (const row of rows) {
                    ws.send(JSON.stringify({
                        type: 'announcement',
                        title: row.title,
                        content: row.content ? row.content.substring(0, 80) : ''
                    }));
                }
                await conn.end();
            } catch (e) {
                console.log(`[公告] 查询失败: ${e.message}`);
            }
            break;

        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

        case 'pong':
            ws.alive = true;
            break;

        default:
            console.log(`[未知] type=${msg.type}`);
    }
}

// 内部推送 API (HTTP)
const http = require('http');
const API_PORT = 1885;

const apiServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ code: 405, msg: 'Method not allowed' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const userId = String(data.userId || '');
            const payload = data.data;

            if (!userId || !payload) {
                res.writeHead(400);
                res.end(JSON.stringify({ code: 400, msg: '缺少 userId 或 data' }));
                return;
            }

            const ws = userConnections.get(userId);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(payload));
                console.log(`[推送] 发送给 userId=${userId}`);
                res.end(JSON.stringify({ code: 200, msg: '已发送', delivered: true }));
            } else {
                // 离线缓存
                if (!pendingMessages.has(userId)) pendingMessages.set(userId, []);
                pendingMessages.get(userId).push(JSON.stringify(payload));
                console.log(`[推送] userId=${userId} 离线，已缓存`);
                res.end(JSON.stringify({ code: 200, msg: '用户离线，已缓存', delivered: false }));
            }
        } catch (e) {
            res.writeHead(400);
            res.end(JSON.stringify({ code: 400, msg: e.message }));
        }
    });
});

apiServer.listen(API_PORT, '127.0.0.1', () => {
    console.log(`推送API: http://127.0.0.1:${API_PORT}`);
});
console.log(`端口: ${WS_PORT}`);
console.log(`心跳: ${PING_INTERVAL}ms`);
