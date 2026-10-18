<template>
	<view v-if="visible" class="up-mask" @click="onOverlay">
		<view class="up-sheet" @click.stop>
			<view class="up-grab" v-if="!force"></view>
			<view class="up-head">
				<view class="up-title-wrap">
					<text class="up-title">{{ title }}</text>
					<text class="up-chip" v-if="version">v{{ version }}</text>
				</view>
				<view class="up-close" v-if="!force" @click="close">
					<text class="up-close-x">✕</text>
				</view>
			</view>
			<text class="up-sub">{{ sub }}</text>
			<view class="up-list" v-if="items.length">
				<view class="up-li" v-for="(it, i) in items" :key="i">
					<view class="up-dot"></view>
					<text class="up-li-t">{{ it }}</text>
				</view>
			</view>
			<view class="up-actions">
				<button class="up-btn ghost" v-if="!force" @click="close">稍后再说</button>
				<button class="up-btn primary" :class="{ solo: force }" @click="goUpdatePage">立即更新</button>
			</view>
			<text class="up-note" v-if="force">更新后将自动重启应用</text>
		</view>
	</view>
</template>

<script>
/**
 * 更新提示抽屉
 *
 * 注意：不能写在 App.vue 的 template 里 —— uni-app 编译 App 端时会把
 * App.vue 的 render 强制置空（app-service.js: _component.render = () => {}），
 * 那里的弹窗永远不会显示。必须作为页面组件挂载。
 *
 * 「立即更新」只负责跳转到 pages/info/check-update（版本更新页），
 * 下载、断点续传、安装都在那个页面里做，避免两处各写一套。
 */
import { compareVersion } from '../../utils/version.js';
import {
	apkVersion,
	fetchUpdateInfo,
	splitUpdateDesc,
	dismissVersion,
	isDismissed
} from '../../utils/update.js';

export default {
	name: 'update-sheet',
	data() {
		return {
			visible: false,
			title: '',
			version: '',
			sub: '',
			items: [],
			force: false,
			_info: null
		};
	},
	mounted() {
		this.refresh();
	},
	methods: {
		refresh() {
			const self = this;
			fetchUpdateInfo().then(function(d) {
				if (!d || !d.hasUpdate) return;
				// 比对安装包版本，不是运行版本：热更新过的设备 wgt 号可能已高于 APK 号，
				// 拿 currentVersion 比会把它们误判成「已最新」，永远收不到全量包。
				const apk = apkVersion();
				if (compareVersion(d.latestVersion, apk) <= 0) return;
				const url = d.downloadUrl || d.apkDownloadUrl || '';
				if (!url) return;
				const force = parseInt(d.forceUpdate || 0, 10) === 1;
				if (!force && isDismissed(d.latestVersion)) return;
				const isWgt = url.indexOf('.wgt') > 0;
				self.title = force ? '需要更新后才能继续' : '发现新版本';
				self.version = d.latestVersion;
				self.sub = force
					? '当前版本已停止服务支持'
					: (isWgt ? '资源包已就绪，安装后自动重启' : '完整安装包 · 建议在 Wi-Fi 下更新');
				self.items = splitUpdateDesc(d.description);
				self._info = { targetUrl: url, isWgt: isWgt, newVer: d.latestVersion };
				self.force = force;
				self.visible = true;
			});
		},
		close() {
			if (this.force) return;
			dismissVersion(this.version);
			this.visible = false;
			this._info = null;
		},
		onOverlay() {
			// 强制更新时不允许点遮罩关闭
			if (!this.force) this.close();
		},
		goUpdatePage() {
			// 收起抽屉（强制更新保留，回到本页仍会提示），跳到版本更新页
			if (!this.force) this.visible = false;
			uni.navigateTo({
				url: '/pages/info/check-update',
				fail: function() {
					uni.showToast({ title: '打不开更新页，请稍后再试', icon: 'none' });
				}
			});
		}
	}
};
</script>

<style>
.up-mask {
	position: fixed; top: 0; right: 0; bottom: 0; left: 0;
	background: rgba(15, 23, 42, 0.32);
	z-index: 99999;
	display: flex; align-items: flex-end;
	animation: upFade 0.18s ease both;
}
.up-sheet {
	width: 100%; background: #fff;
	border-radius: 28rpx 28rpx 0 0;
	padding: 16rpx 40rpx calc(24rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -24rpx 80rpx -32rpx rgba(15, 23, 42, 0.3);
	animation: upSlide 0.22s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
.up-grab {
	width: 64rpx; height: 8rpx; border-radius: 4rpx;
	background: #E5EAF2; margin: 0 auto 28rpx;
}
.up-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.up-title-wrap { display: flex; align-items: center; }
.up-title { font-size: 32rpx; font-weight: 600; color: #111827; }
.up-chip {
	font-size: 22rpx; font-weight: 600; color: #1B44A6;
	background: #F1F5FD; padding: 4rpx 14rpx; border-radius: 12rpx; margin-left: 14rpx;
}
.up-close {
	width: 52rpx; height: 52rpx; border-radius: 50%;
	background: #F4F6FA; display: flex; align-items: center; justify-content: center;
}
.up-close-x { font-size: 24rpx; color: #94A3B8; line-height: 1; }
.up-sub {
	display: block; font-size: 24rpx; color: #6B7280;
	line-height: 1.6; margin-bottom: 24rpx;
}
.up-list { border-top: 1rpx solid #EDF0F4; margin-bottom: 28rpx; max-height: 56vh; overflow-y: auto; }
.up-li { display: flex; align-items: flex-start; padding: 20rpx 0; border-bottom: 1rpx solid #F4F6FA; }
.up-li:last-child { border-bottom: none; }
.up-dot {
	flex: none; width: 10rpx; height: 10rpx; border-radius: 50%;
	background: #1B44A6; opacity: 0.55; margin: 12rpx 18rpx 0 0;
}
.up-li-t { flex: 1; font-size: 24rpx; color: #4B5563; line-height: 1.55; }
.up-actions { display: flex; }
.up-btn {
	flex: 1; height: 84rpx; line-height: 84rpx; font-size: 28rpx; font-weight: 600;
	border-radius: 12rpx; border: none; padding: 0; margin: 0;
}
.up-btn::after { border: none; }
.up-btn.ghost {
	background: #fff; color: #4B5563; border: 1rpx solid #E5EAF2; margin-right: 20rpx;
}
.up-btn.primary { background: #1B44A6; color: #fff; }
.up-btn.primary.solo { flex: none; width: 100%; margin-right: 0; }
.up-note {
	display: block; text-align: center; font-size: 22rpx;
	color: #A3AEC2; margin-top: 20rpx;
}
@keyframes upFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes upSlide { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
