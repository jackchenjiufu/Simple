<template>
	<view class="app-container">
		<slot />
	</view>
</template>

<script>
import apiConfig from './utils/api.js';

// WebSocket 配置
var WS_URL = 'ws://139.196.185.197:1884';
var wsSocket = null;
var wsReconnectTimer = null;
var wsConnected = false;
var wsHeartbeatTimer = null;

function connectWebSocket() {
	if (wsConnected || wsSocket) return;
	var userId = uni.getStorageSync('userId');
	if (!userId) return;

	try {
		wsSocket = uni.connectSocket({
			url: WS_URL,
			success: function() {
				console.log('WebSocket 连接中...');
			}
		});

		wsSocket.onOpen(function() {
			wsConnected = true;
			wsSocket.send({
				data: JSON.stringify({ type: 'auth', userId: userId })
			});
			console.log('WebSocket 已连接');
			clearTimeout(wsReconnectTimer);
			// 启动心跳，每30秒发送一次ping
			clearInterval(wsHeartbeatTimer);
			wsHeartbeatTimer = setInterval(function() {
				if (wsConnected && wsSocket) {
					wsSocket.send({ data: JSON.stringify({ type: 'ping' }) });
				}
			}, 12000);
		});

		wsSocket.onMessage(function(res) {
			try {
				var msg = JSON.parse(res.data);
				handleWsMessage(msg);
			} catch(e) {}
		});

		wsSocket.onClose(function() {
			wsConnected = false;
			wsSocket = null;
			clearInterval(wsHeartbeatTimer);
			console.log('WebSocket 已断开');
			wsReconnectTimer = setTimeout(function() {
				if (uni.getStorageSync('isLoggedIn')) {
					connectWebSocket();
				}
			}, 12000);
		});

		wsSocket.onError(function() {
			wsConnected = false;
			console.log('WebSocket 连接错误');
		});
	} catch(e) {
		console.log('WebSocket 创建失败:', e);
	}
}

function disconnectWebSocket() {
	clearTimeout(wsReconnectTimer);
	clearInterval(wsHeartbeatTimer);
	if (wsSocket) {
		wsSocket.close();
		wsSocket = null;
	}
	wsConnected = false;
}

function handleWsMessage(msg) {
	switch (msg.type) {
		case 'auth_result':
			if (msg.success) {
				console.log('WebSocket 认证成功');
			}
			break;
		case 'pong':
			break;
		case 'ping':
			// 服务端ping，回复pong
			if (wsConnected && wsSocket) {
				wsSocket.send({ data: JSON.stringify({ type: 'pong' }) });
			}
			break;
		case 'kick':
			disconnectWebSocket();
			break;
		default:
			if (msg.title || msg.content) {
				try {
					if (typeof uni !== 'undefined' && uni.createPushMessage) {
						uni.createPushMessage({
							title: msg.title || '新消息',
							content: msg.content || ''
						});
					}
				} catch(e) {}
			}
			uni.$emit('ws-message', msg);
	}
}

uni.$ws = {
	connect: connectWebSocket,
	disconnect: disconnectWebSocket
};
export default {
	globalData: {
		userInfo: null
	},
	onLaunch: function() {
		// 初始化 WebSocket 连接
		connectWebSocket();
		var loginPages = [
			"pages/auth/login",
			"pages/auth/forgot-password",
			"pages/auth/reset-password"
		];
		function isLoginPage(url) {
			for (var i = 0; i < loginPages.length; i++) {
				if (url.indexOf(loginPages[i]) >= 0) return true;
			}
			return false;
		}
		function redirectToLogin() {
			var pages = getCurrentPages();
			var currentPath = pages.length > 0 ? pages[pages.length - 1].route : '';
			if (isLoginPage(currentPath)) return;
			uni.reLaunch({ url: "/pages/auth/login" });
		}
		var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
		if (!isLoggedIn) {
			redirectToLogin();
		}
		uni.addInterceptor("navigateTo", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		uni.addInterceptor("switchTab", {
			invoke: function(args) {
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		uni.addInterceptor("reLaunch", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		// 安装待处理的WGT更新
		this.installPendingWgt();
		this.silentCheckWgt();
	},
	onShow: function() {
	},
	methods: {
		silentCheckWgt() {
			// #ifdef APP-PLUS
			var storedVer = uni.getStorageSync('wgtVersion') || '';
			var sysInfo = uni.getSystemInfoSync();
			var curVer = storedVer || sysInfo.appVersion || '1.0.0';
			uni.request({
				url: apiConfig.baseUrl + 'check_update.php',
				method: 'POST',
				data: { currentVersion: curVer },
				success: function(res) {
					var result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result?.code === 200 && result.data?.hasUpdate && result.data?.downloadUrl) {
						var newVer = result.data.latestVersion;
						var dlUrl = result.data.downloadUrl;
						plus.downloader.createDownload(dlUrl, { filename: '_doc/update/' }, function(dl, status) {
							if (status === 200) {
								uni.setStorageSync('pendingWgtPath', dl.filename);
								uni.setStorageSync('pendingWgtVersion', newVer);
							}
						}).start();
					}
				}
			});
			// #endif
		},
		installPendingWgt() {
			var wgtPath = uni.getStorageSync('pendingWgtPath');
			if (!wgtPath || typeof plus === 'undefined') return;
			plus.io.resolveLocalFileSystemURL(wgtPath, function() {
				plus.runtime.install(wgtPath, { force: true }, function() {
					var ver = uni.getStorageSync('pendingWgtVersion') || '';
					if (ver) uni.setStorageSync('wgtVersion', ver);
					uni.removeStorageSync('pendingWgtPath');
					uni.removeStorageSync('pendingWgtVersion');
					setTimeout(function() {
						plus.runtime.restart();
					}, 500);
				}, function() {
					uni.removeStorageSync('pendingWgtPath');
					uni.removeStorageSync('pendingWgtVersion');
				});
			}, function() {
				uni.removeStorageSync('pendingWgtPath');
			});
		}
	}
};

function compareVersion(v1, v2) {
	var a1 = v1.split('.').map(Number);
	var a2 = v2.split('.').map(Number);
	for (var i = 0; i < Math.max(a1.length, a2.length); i++) {
		var n1 = a1[i] || 0;
		var n2 = a2[i] || 0;
		if (n1 > n2) return 1;
		if (n1 < n2) return -1;
	}
	return 0;
}
</script>

<style>
@import "./static/css/global.css";
.app-container {
	width: 100%;
	height: 100vh;
	background-color: var(--bg-light);
}
page {
	width: 100%;
	height: 100%;
}
</style>
