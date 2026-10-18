<template>
	<view class="page">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 导航条 -->
		<view class="nav">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">关于我们</text>
			<view class="nav-ph"></view>
		</view>

		<scroll-view class="body" scroll-y :show-scrollbar="false">
			<!-- 品牌区 -->
			<view class="brand rise a1">
				<image class="mark rise-scale a2" src="/static/img/app-icon.png" mode="aspectFit"></image>
				<text class="brand-name">Simple</text>
				<view class="chip"><view class="chip-dot"></view><text class="chip-t">v{{ currentVersion }}</text></view>
				<text class="brand-sub">内容、工时、设备，一个 App</text>
			</view>

			<!-- 应用 -->
			<view class="group rise a3">
				<text class="glabel">应用</text>
				<view class="card">
					<view class="row" @click="goCheckUpdate">
						<text class="t">检查更新</text>
						<text class="v" :class="{ 'v-new': hasNewer }">{{ hasNewer ? 'v' + latestVersion : '已是最新' }}</text>
						<view class="arrow"></view>
					</view>
					<view class="row">
						<text class="t">当前版本</text>
						<text class="v">{{ currentVersion }}</text>
					</view>
					<view class="row" @click="openUrl(GH)">
						<text class="t">GitHub</text>
						<text class="v">jackchenjiufu/Simple</text>
						<view class="arrow"></view>
					</view>
					<view class="row" @click="openUrl(GITEE)">
						<text class="t">Gitee</text>
						<text class="v">simplejiufu/simple</text>
						<view class="arrow"></view>
					</view>
					<view class="row" @click="openUrl(SITE + '#changelog')">
						<text class="t">更新日志</text>
						<view class="arrow"></view>
					</view>
				</view>
			</view>

			<!-- 联系我 -->
			<view class="group rise a4">
				<text class="glabel">联系我</text>
				<view class="card">
					<view class="row" @click="copyText('chensauce@qq.com', '邮箱已复制')">
						<text class="t">邮箱</text>
						<text class="v">chensauce@qq.com</text>
						<view class="copy">复制</view>
					</view>
					<view class="row" @click="copyText('ChenSauce', '微信号已复制')">
						<text class="t">微信</text>
						<text class="v">ChenSauce</text>
						<view class="copy">复制</view>
					</view>
					<view class="row" @click="openUrl('https://simpleboat.cc')">
						<text class="t">官方网站</text>
						<text class="v">simpleboat.cc</text>
						<view class="arrow"></view>
					</view>
				</view>
			</view>

			<!-- 条款 -->
			<view class="group rise a5">
				<text class="glabel">条款</text>
				<view class="card">
					<view class="row" @click="goPage('/pages/info/privacy-policy')">
						<text class="t">隐私政策</text>
						<view class="arrow"></view>
					</view>
					<view class="row" @click="goPage('/pages/info/user-agreement')">
						<text class="t">用户协议</text>
						<view class="arrow"></view>
					</view>
				</view>
			</view>

			<view class="foot rise a5">
				<text class="foot-1">© 2026 Simple · 一个人维护</text>
				<text class="foot-2">内容、工时、设备，都在自己手里</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';

const GH = 'https://github.com/jackchenjiufu/Simple';
const GITEE = 'https://gitee.com/simplejiufu/simple';
const SITE = 'http://139.196.185.197:1010/app/';

export default {
	data() {
		return {
			statusBarHeight: 0,
			currentVersion: '1.0.0',
			latestVersion: '1.0.0',
			GH,
			GITEE,
			SITE
		};
	},
	computed: {
		hasNewer() {
			return compareVersion(this.latestVersion, this.currentVersion) > 0;
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.currentVersion = info.appVersion || '1.0.0';
		// 白色头部 → 状态栏用深色字
		// #ifdef APP-PLUS
		try { plus.navigator.setStatusBarStyle('dark'); } catch (e) {}
		// #endif
		this.loadVersion();
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},
		goPage(url) {
			uni.navigateTo({ url });
		},
		goCheckUpdate() {
			uni.navigateTo({ url: '/pages/info/check-update' });
		},
		/** 真打开浏览器；H5/小程序端降级为复制 */
		openUrl(url) {
			// #ifdef APP-PLUS
			plus.runtime.openURL(url, function () {
				uni.showToast({ title: '打开失败，已复制链接', icon: 'none' });
				uni.setClipboardData({ data: url });
			});
			return;
			// #endif
			// #ifndef APP-PLUS
			this.copyText(url, '链接已复制');
			// #endif
		},
		copyText(text, tip) {
			uni.setClipboardData({
				data: text,
				success() {
					uni.showToast({ title: tip || '已复制', icon: 'none' });
				}
			});
		},
		/** 版本号取 APK 与 wgt 里较大的那个，再问后端有没有更新的 */
		async loadVersion() {
			try {
				const apkVer = uni.getSystemInfoSync().appVersion || '1.0.0';
				const wgtVer = uni.getStorageSync('wgtVersion') || '';
				const ver = wgtVer && compareVersion(wgtVer, apkVer) > 0 ? wgtVer : apkVer;
				this.currentVersion = ver;
				const res = await uni.request({
					url: apiConfig.baseUrl + 'check_update.php',
					method: 'POST',
					data: { currentVersion: ver },
					header: { 'Content-Type': 'application/json' }
				});
				if (res.statusCode === 200) {
					const r = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (r && r.code === 200 && r.data) {
						this.latestVersion = r.data.latestVersion || ver;
						this.currentVersion = ver;
					}
				}
			} catch (e) {
				console.error('loadVersion', e);
			}
		}
	}
};

function compareVersion(v1, v2) {
	const a1 = String(v1).split('.').map(Number);
	const a2 = String(v2).split('.').map(Number);
	for (let i = 0; i < Math.max(a1.length, a2.length); i++) {
		const n1 = a1[i] || 0;
		const n2 = a2[i] || 0;
		if (n1 > n2) return 1;
		if (n1 < n2) return -1;
	}
	return 0;
}
</script>

<style>
/* ========== 页面 ========== */
.page { width: 100%; height: 100vh; background-color: #F5F8FD; display: flex; flex-direction: column; }
.status-bar { width: 100%; background-color: #FFFFFF; flex-shrink: 0; }

/* ========== 导航条 ========== */
.nav {
	height: 88rpx; background-color: #FFFFFF; display: flex; align-items: center;
	padding: 0 24rpx; position: relative; flex-shrink: 0;
}
.nav-back { width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 36rpx; height: 36rpx; }
.nav-title { position: absolute; left: 0; right: 0; text-align: center; font-size: 32rpx; font-weight: 600; color: #0E1B33; }
.nav-ph { width: 56rpx; }

.body { flex: 1; }

/* ========== 品牌区 ========== */
.brand { background-color: #FFFFFF; padding: 44rpx 0 48rpx; display: flex; flex-direction: column; align-items: center; border-bottom: 1rpx solid #EDF0F4; }
.mark { width: 142rpx; height: 142rpx; border-radius: 33rpx; }
.brand-name { font-size: 38rpx; font-weight: 700; color: #0E1B33; margin-top: 26rpx; letter-spacing: -0.4rpx; }
.chip {
	display: flex; align-items: center; margin-top: 14rpx;
	padding: 5rpx 18rpx; border-radius: 99rpx; background-color: #F1F5FD;
}
.chip-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background-color: #3BC49B; margin-right: 10rpx; }
.chip-t { font-size: 22rpx; font-weight: 600; color: #1B44A6; }
.brand-sub { font-size: 24rpx; color: #8A99B5; margin-top: 18rpx; }

/* ========== 分组 ========== */
.group { margin-top: 42rpx; }
.glabel { display: block; font-size: 23rpx; color: #8A99B5; padding: 0 56rpx 13rpx; }
.card { background-color: #FFFFFF; margin: 0 32rpx; border-radius: 24rpx; overflow: hidden; }

.row {
	display: flex; align-items: center; min-height: 96rpx; padding: 0 32rpx; position: relative;
}
.row + .row::before {
	content: ""; position: absolute; top: 0; left: 32rpx; right: 0; height: 1rpx; background-color: #EDF0F4;
}
.row:active { background-color: #F7F9FD; }
.t { font-size: 28rpx; color: #0E1B33; flex: 1; }
.v { font-size: 26rpx; color: #8A99B5; }
.v-new { color: #1B44A6; font-weight: 600; }

.arrow {
	width: 14rpx; height: 14rpx; margin-left: 14rpx; flex-shrink: 0;
	border-right: 3rpx solid #C3CBDA; border-bottom: 3rpx solid #C3CBDA;
	transform: rotate(-45deg);
}
.copy {
	font-size: 23rpx; color: #1B44A6; border: 1rpx solid #D6E2F8; background-color: #FFFFFF;
	border-radius: 13rpx; padding: 6rpx 18rpx; margin-left: 14rpx;
}

/* ========== 底部 ========== */
.foot { padding: 52rpx 0 60rpx; display: flex; flex-direction: column; align-items: center; }
.foot-1 { font-size: 22rpx; color: #B8C2D4; }
.foot-2 { font-size: 21rpx; color: #CBD3E1; margin-top: 10rpx; }

/* ========== 入场动画：分组自上而下依次升起 ========== */
@keyframes riseIn {
	from { opacity: 0; transform: translateY(19rpx); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes markIn {
	from { opacity: 0; transform: scale(0.9); }
	to { opacity: 1; transform: scale(1); }
}
.rise { animation: riseIn 320ms cubic-bezier(0.22, 0.8, 0.3, 1) both; }
.rise-scale { animation: markIn 380ms cubic-bezier(0.22, 0.8, 0.3, 1) both; }
.a1 { animation-delay: 0ms; }
.a2 { animation-delay: 40ms; }
.a3 { animation-delay: 80ms; }
.a4 { animation-delay: 140ms; }
.a5 { animation-delay: 200ms; }
</style>
