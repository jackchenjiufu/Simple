# 服务器状态监控(server-monitor)

标准的服务器状态监控看板:**Node.js 后端本机自采集指标 + 原生前端实时展示**。
零依赖,不需要安装任何 npm 包,复制到任意服务器即可运行(本机监控)。

## 快速开始

```bash
node server.js
```

浏览器打开 <http://localhost:8080>(端口被占用时自动 +1 递增寻找可用端口,启动日志会打印实际地址)。

| 环境变量 | 说明 | 默认值 |
| -------- | ---- | ------ |
| `PORT`   | 监听端口 | `8080` |

自定义端口:

```bash
PORT=9000 node server.js
```

## 功能

- **概览卡片**:CPU(含每核)、内存(含 Swap)、磁盘、系统负载/运行时间,环形仪表实时显示,超阈值自动变色(正常/偏高/危险)
- **历史曲线**:CPU 使用率、内存使用率、网络吞吐(下行/上行),约 6 分钟滚动,2 秒刷新,**鼠标悬停可查看任意时刻数值**
- **明细面板**:每核使用率、磁盘分区占用、网络接口收发总量与实时速率
- **进程列表**:按 CPU 排序的 Top 15 进程(PID、CPU%、内存%、RSS、命令行)
- **运维细节**:连接状态呼吸灯、暂停/继续按钮、页面隐藏自动暂停、窗口缩放自适应重绘、端口占用心动切换

## API

| 路径 | 说明 |
| ---- | ---- |
| `GET /api/stats` | JSON 快照 + 滚动历史(CPU/内存/网络 2s 采样,磁盘/进程 5s 采样,保留约 6 分钟) |
| `GET /` | 监控看板页面 |

`/api/stats` 主要字段:

```jsonc
{
  "hostname": "主机名",
  "platform": "系统类型/版本/架构",
  "uptime": 12345,            // 运行秒数
  "bootTime": 1710000000000,  // 启动时间戳
  "loadavg": [0.5, 0.3, 0.2], // 1/5/15 分钟负载(Windows 恒为 0)
  "cpu": { "usage": 12.3, "cores": [..], "coresCount": 8, "model": ".." },
  "memory": { "total": .., "used": .., "free": .., "percent": 12.3 },
  "swap": { "total": .., "used": .., "free": .., "percent": 0 },  // Windows 为 null
  "disk": [{ "fs": "dev", "mount": "/", "total": .., "used": .., "free": .., "usePercent": 33.3 }],
  "network": { "rx": .., "tx": .., "rxAvailable": true, "ifaces": [{ "name": "eth0", "address": "..", "rx": .., "tx": .. }] },
  "processes": [{ "pid": 1, "name": "systemd", "cpu": 0.1, "memPct": 0.2, "rss": 123456, "cmd": ".." }],
  "history": { "t": [..], "cpu": [..], "mem": [..], "rx": [..], "tx": [..] }
}
```

> 说明:Swap(Windows)、负载(Windows)、网卡字节计数器(部分 Windows 驱动/容器)系统不提供,前端会显示"不支持/不可用",不影响其它指标。

## 部署示例

生产环境建议用进程守护工具托管:

```bash
# systemd (Linux),/etc/systemd/system/server-monitor.service
[Unit]
Description=Server Monitor
After=network.target

[Service]
WorkingDirectory=/opt/server-monitor
ExecStart=/usr/bin/node server.js
Environment=PORT=8080
Restart=always

[Install]
WantedBy=multi-user.target
```

或 PM2:

```bash
pm2 start server.js --name server-monitor && pm2 save
```

如已有 Nginx,可反代 `/` 到 `127.0.0.1:8080` 并加 Basic Auth 鉴权(默认无鉴权,公网部署务必加)。

## 兼容性

- Linux / macOS / Windows(磁盘、进程、网卡计数按平台自动适配)
- Node.js ≥ 12(Linux 下 Swap 读取依赖 `/proc/meminfo`)
- 浏览器:现代 Chrome / Edge / Firefox / Safari

## 目录结构

```
server-monitor/
├── server.js          # 后端:指标采集 + HTTP 服务
├── public/
│   ├── index.html     # 看板页面
│   ├── style.css      # 深色主题样式
│   └── app.js         # 前端逻辑(轮询、仪表、canvas 曲线)
└── README.md
```