<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack"><image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image></view>
			<text class="nav-title">系统设置</text>
			<view class="nav-placeholder"></view>
		</view>
		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 站点信息 -->
			<view class="section-title">站点信息</view>
			<view class="form-card">
				<view class="form-item"><text class="form-label">站点名称</text><input class="form-input" v-model="site.site_name" placeholder="DOO" /></view>
				<view class="form-item"><text class="form-label">站点描述</text><input class="form-input" v-model="site.site_desc" placeholder="一句话描述" /></view>
				<view class="form-item"><text class="form-label">Logo 地址</text><input class="form-input" v-model="site.logo_url" placeholder="https://..." /></view>
				<button class="btn btn-primary" style="margin-top:20upx" @click="saveSite">保存站点信息</button>
			</view>

			<!-- 系统配置 -->
			<view class="section-title">系统配置（只读）</view>
			<view class="info-card" v-if="cfg">
				<view class="info-row"><text class="info-label">API 版本</text><text class="info-value">{{ cfg.api_version }}</text></view>
				<view class="info-row"><text class="info-label">Redis</text><text class="info-value">{{ cfg.redis && cfg.redis.enabled ? '启用 ' + cfg.redis.host + ':' + cfg.redis.port : '停用' }}</text></view>
				<view class="info-row"><text class="info-label">AI 模型</text><text class="info-value">{{ cfg.ai_model }}</text></view>
				<view class="info-row"><text class="info-label">上传限制</text><text class="info-value">{{ cfg.upload_max_size ? (cfg.upload_max_size/1048576).toFixed(0) + 'MB' : '-' }}</text></view>
				<view class="info-row"><text class="info-label">Web 服务器</text><text class="info-value">{{ cfg.server_software || '-' }}</text></view>
			</view>

			<!-- 修改密码 -->
			<view class="section-title">修改密码</view>
			<view class="form-card">
				<view class="form-item"><text class="form-label">旧密码</text><input class="form-input" v-model="pwd.old" password placeholder="当前密码" /></view>
				<view class="form-item"><text class="form-label">新密码</text><input class="form-input" v-model="pwd.next" password placeholder="至少 6 位" /></view>
				<view class="form-item"><text class="form-label">确认新密码</text><input class="form-input" v-model="pwd.confirm" password placeholder="再次输入" /></view>
				<button class="btn btn-warn" style="margin-top:20upx" @click="changePwd">修改密码</button>
			</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
export default {
	data() { return { statusBarHeight: 0, site: { site_name: 'DOO', site_desc: '', logo_url: '' }, cfg: null, pwd: { old: '', next: '', confirm: '' } }; },
	onLoad() { const si = uni.getSystemInfoSync(); this.statusBarHeight = si.statusBarHeight || 0; this.load(); },
	methods: {
		goBack() { uni.navigateBack(); },
		async load() {
			try { const r = await adminApi.getSiteInfo(); if (r.code === 200) this.site = r.data; } catch(e) {}
			try { const r = await adminApi.getSystemConfig(); if (r.code === 200) this.cfg = r.data; } catch(e) {}
		},
		async saveSite() {
			if (!this.site.site_name.trim()) { uni.showToast({ title: '站点名称不能为空', icon: 'none' }); return; }
			try { const r = await adminApi.saveSiteInfo(this.site); if (r.code === 200) uni.showToast({ title: r.message, icon: 'none' }); else uni.showToast({ title: r.message || '保存失败', icon: 'none' }); } catch(e) { uni.showToast({ title: '保存失败', icon: 'none' }); }
		},
		async changePwd() {
			if (!this.pwd.old || !this.pwd.next) { uni.showToast({ title: '请填写完整', icon: 'none' }); return; }
			if (this.pwd.next !== this.pwd.confirm) { uni.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
			uni.showModal({ title: '修改密码', content: '修改后需重新登录，确认？', success: async (res) => {
				if (!res.confirm) return;
				try { const r = await adminApi.changeAdminPassword(this.pwd.old, this.pwd.next); if (r.code === 200) { uni.showToast({ title: r.message, icon: 'success' }); this.pwd = { old: '', next: '', confirm: '' }; } else uni.showToast({ title: r.message || '修改失败', icon: 'none' }); } catch(e) { uni.showToast({ title: '修改失败', icon: 'none' }); }
			}});
		}
	}
};
</script>
<style>
.content { min-height: 100vh; background: #f7f8fa; }
.status-bar { width: 100%; background: #fff; }
.nav-bar { display: flex; align-items: center; height: 88upx; background: #fff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 64upx; height: 64upx; display: flex; align-items: center; }
.back-icon { width: 44upx; height: 44upx; }
.nav-title { flex: 1; text-align: center; font-size: 32upx; font-weight: 600; }
.nav-placeholder { width: 64upx; }
.body { height: calc(100vh - 88upx); }
.section-title { font-size: 26upx; color: #909399; margin: 24upx 24upx 12upx; }
.info-card, .form-card { background: #fff; margin: 0 24upx; border-radius: 16upx; padding: 8upx 24upx; }
.info-row { display: flex; justify-content: space-between; padding: 14upx 0; border-bottom: 1px solid #f7f8fa; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26upx; color: #666; }
.info-value { font-size: 26upx; color: #333; font-weight: 500; }
.form-item { display: flex; align-items: center; padding: 14upx 0; border-bottom: 1px solid #f7f8fa; }
.form-item:last-child { border-bottom: none; }
.form-label { width: 160upx; font-size: 26upx; color: #666; }
.form-input { flex: 1; font-size: 28upx; color: #333; }
.btn { height: 84upx; line-height: 84upx; border-radius: 14upx; font-size: 30upx; }
.btn-primary { background: #2f6bf0; color: #fff; }
.btn-warn { background: #e6a23c; color: #fff; }
</style>
