<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">系统权限</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="header-content">
				<text class="header-title">权限管理</text>
				<text class="header-subtitle">管理应用所需权限</text>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<view class="info-card">
				<text class="card-title">必要权限</text>
				<view class="perm-item" v-for="p in requiredPerms" :key="p.id" @click="openAppSettings">
					<view class="perm-info">
						<text class="perm-name">{{ p.name }}</text>
						<text class="perm-desc">{{ p.desc }}</text>
					</view>
					<view class="perm-right">
						<text class="perm-status" :class="p.status">{{ p.statusLabel }}</text>
					</view>
				</view>
			</view>

			<view class="info-card">
				<text class="card-title">可选权限</text>
				<view class="perm-item" v-for="p in optionalPerms" :key="p.id" @click="openAppSettings">
					<view class="perm-info">
						<text class="perm-name">{{ p.name }}</text>
						<text class="perm-desc">{{ p.desc }}</text>
					</view>
					<view class="perm-right">
						<text class="perm-status" :class="p.status">{{ p.statusLabel }}</text>
					</view>
				</view>
			</view>

			<view class="hint-card" @click="openAppSettings">
				<text class="hint-text">如需修改权限，请在系统设置中操作 ›</text>
			</view>

			<text class="footer-text">DOO v{{ appVersion }}</text>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			appVersion: '1.0.0',
			requiredPerms: [
				{ id: 'storage', name: '存储空间', desc: '读取和写入文件，用于缓存和下载图片', status: 'unknown' },
				{ id: 'camera', name: '相机', desc: '拍摄照片用于更换头像等', status: 'unknown' },
			],
			optionalPerms: [
				{ id: 'location', name: '位置信息', desc: '获取设备位置用于打卡签到', status: 'unknown' },
				{ id: 'notification', name: '通知', desc: '接收消息推送和系统通知', status: 'unknown' },
				{ id: 'microphone', name: '麦克风', desc: '用于语音输入等功能', status: 'unknown' },
			]
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.appVersion = systemInfo.appVersion || '1.0.0';
		this.checkPermissions();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		checkPermissions() {
			const setLabel = (p) => {
				p.statusLabel = p.status === 'granted' ? '已授权' : (p.status === 'denied' ? '去设置' : '检测中');
			};
			this.requiredPerms.forEach(setLabel);
			this.optionalPerms.forEach(setLabel);
			// @ts-ignore
			if (typeof plus === 'undefined' || !plus.android) {
				this.requiredPerms.forEach(p => { p.status = 'denied'; p.statusLabel = '去设置'; });
				this.optionalPerms.forEach(p => { p.status = 'denied'; p.statusLabel = '去设置'; });
				return;
			}
			try {
				// @ts-ignore
				const main = plus.android.runtimeMainActivity();
				// @ts-ignore
				const pm = main.getPackageManager();
				const pkg = main.getPackageName();
				const granted = (perm) => {
					// @ts-ignore
					return pm.checkPermission(perm, pkg) === 0;
				};

				this.requiredPerms.forEach(p => {
					if (p.id === 'storage') {
						const sdk = parseInt((plus.os.version || '0').split('.')[0]);
						p.status = sdk >= 29 ? 'granted' : (granted('android.permission.WRITE_EXTERNAL_STORAGE') ? 'granted' : 'denied');
					} else if (p.id === 'camera') {
						p.status = granted('android.permission.CAMERA') ? 'granted' : 'denied';
					}
					setLabel(p);
				});

				this.optionalPerms.forEach(p => {
					if (p.id === 'location') {
						p.status = granted('android.permission.ACCESS_FINE_LOCATION') ? 'granted' : 'denied';
					} else if (p.id === 'notification') {
						p.status = 'denied';
					} else if (p.id === 'microphone') {
						p.status = granted('android.permission.RECORD_AUDIO') ? 'granted' : 'denied';
					}
					setLabel(p);
				});
			} catch(e) {
				this.requiredPerms.forEach(p => { p.status = 'denied'; setLabel(p); });
				this.optionalPerms.forEach(p => { p.status = 'denied'; setLabel(p); });
			}
		},
		openAppSettings() {
			// @ts-ignore
			if (typeof plus === 'undefined') {
				uni.showToast({ title: '仅支持App端', icon: 'none' });
				return;
			}
			try {
				// @ts-ignore
				const main = plus.android.runtimeMainActivity();
				// @ts-ignore
				const Intent = plus.android.importClass('android.content.Intent');
				// @ts-ignore
				const Settings = plus.android.importClass('android.provider.Settings');
				// @ts-ignore
				const Uri = plus.android.importClass('android.net.Uri');
				const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
				intent.setData(Uri.parse('package:' + main.getPackageName()));
				main.startActivity(intent);
			} catch(e) {
				uni.showToast({ title: '无法打开系统设置', icon: 'none' });
			}
		}
	}
}
</script>

<style>
.content { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; flex-shrink: 0; }
.header-section { position: relative; background: #1b44a6; border-radius: 0 0 48upx 48upx; padding-bottom: 60upx; overflow: hidden; flex-shrink: 0; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 32upx; font-weight: 600; color: #ffffff; letter-spacing: 2upx; }
.nav-placeholder { width: 72upx; }
.header-content { position: relative; z-index: 2; padding: 20upx 40upx 0; text-align: left; padding-left: 48upx; }
.header-title { font-size: 34upx; font-weight: 700; color: #ffffff; display: block; margin-bottom: 8upx; }
.header-subtitle { font-size: 24upx; color: rgba(255,255,255,0.65); display: block; }
.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 200upx; height: 200upx; top: -60upx; right: -40upx; }
.dot-2 { width: 120upx; height: 120upx; bottom: 20upx; left: -30upx; }
.body { flex: 1; min-height: 0; background: #ffffff; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }
.info-card { background: #ffffff; border-radius: 16upx; padding: 28upx 24upx; margin-bottom: 16upx; box-shadow: 0 2upx 12upx rgba(0,0,0,0.06); }
.card-title { display: block; font-size: 28upx; font-weight: 600; color: #1f2937; margin-bottom: 16upx; }
.perm-item { display: flex; align-items: center; justify-content: space-between; padding: 16upx 0; border-bottom: 1px solid #f5f5f5; }
.perm-item:last-child { border-bottom: none; }
.perm-info { flex: 1; min-width: 0; }
.perm-name { font-size: 26upx; font-weight: 500; color: #1f2937; display: block; }
.perm-desc { font-size: 22upx; color: #9ca3af; display: block; margin-top: 4upx; }
.perm-right { flex-shrink: 0; }
.perm-status { font-size: 24upx; padding: 6upx 16upx; border-radius: 9999upx; display: inline-block; }
.perm-status.granted { background: #ecfdf5; color: #10b981; }
.perm-status.denied { background: #fef2f2; color: #ef4444; }
.perm-status.unknown { background: #f3f4f6; color: #9ca3af; }
.hint-card { text-align: center; padding: 24upx 0; }
.hint-text { font-size: 24upx; color: #3071f6; text-decoration: underline; }
.footer-text { display: block; text-align: center; font-size: 22upx; color: #c0c4cc; padding: 24upx 0 40upx; }
::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
