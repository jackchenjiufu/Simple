<template>
	<view class="ad-page">
		<admin-nav title="系统维护"></admin-nav>
		<scroll-view class="ad-body" scroll-y="true" show-scrollbar="false">
			<view class="ad-sec">系统监控</view>
			<view class="ad-card" v-if="monitor">
				<view class="ad-row"><text class="ad-label">服务器负载</text><text class="ad-value">{{ monitor.load || '-' }}</text></view>
				<view class="ad-row"><text class="ad-label">内存使用</text><text class="ad-value">{{ monitor.memory || '-' }}</text></view>
				<view class="ad-row"><text class="ad-label">磁盘</text><text class="ad-value">{{ monitor.disk || '-' }}</text></view>
				<view class="ad-row"><text class="ad-label">数据库</text><text class="ad-value">{{ monitor.db ? '正常' : '-' }}</text></view>
			</view>
			<view class="ad-empty" v-if="!monitor">暂无监控数据</view>
			<text class="ad-item-action" style="margin:0 4upx 12upx;display:inline-block" @click="load">刷新监控</text>

			<view class="ad-sec">AI 配置（GLM 识图）</view>
			<view class="ad-card">
				<view class="ad-row"><text class="ad-label">DeepSeek 模型</text><text class="ad-value">{{ ai.model || '-' }}</text></view>
				<view class="ad-row"><text class="ad-label">GLM 识图模型</text><text class="ad-value">{{ ai.glm_vision_model || '-' }}</text></view>
				<view class="ad-row"><text class="ad-label">GLM Key</text><text class="ad-value">{{ ai.glm_api_key || '未配置' }}</text></view>
				<view class="ad-row"><text class="ad-label">说明</text><text class="ad-value" style="font-size:22upx;color:#909399">Key 已脱敏，仅显示前后各 4 位</text></view>
				<view class="ad-btn-row">
					<text class="ad-btn ad-btn-primary" @click="testVision">测试识图</text>
					<text class="ad-btn ad-btn-plain" @click="loadAi">刷新</text>
				</view>
			</view>

			<view class="ad-sec">数据维护</view>
			<view class="ad-card">
				<view class="ad-row">
					<text class="ad-label">反馈数据迁移</text>
					<text class="ad-item-action" @click="migrate">执行</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
import AdminNav from '../../components/admin/AdminNav.vue';
export default {
	components: { AdminNav },
	data() { return { monitor: null, ai: {} }; },
	onLoad() { this.load(); this.loadAi(); },
	methods: {
		async load() {
			try { const r = await adminApi.getSystemMonitor(); if (r.code === 200) this.monitor = r.data; } catch(e) {}
		},
		async loadAi() {
			try { const r = await adminApi.getAiConfig(); if (r.code === 200) this.ai = r.data || {}; } catch(e) {}
		},
		testVision() {
			uni.showLoading({ title: '识图测试中' });
			adminApi.testAiVision({}).then(r => { uni.hideLoading(); uni.showModal({ title: r.code === 200 ? '识图成功' : '测试失败', content: (r.code === 200 && r.data && r.data.glm_reply) || r.message || '', showCancel: false }); }).catch(() => { uni.hideLoading(); uni.showToast({ title: '请求失败', icon: 'none' }); });
		},
		migrate() {
			uni.showLoading({ title: '迁移中' });
			adminApi.migrateFeedback().then(r => { uni.hideLoading(); uni.showToast({ title: (r && r.message) || '完成', icon: 'none' }); }).catch(() => { uni.hideLoading(); uni.showToast({ title: '迁移失败', icon: 'none' }); });
		}
	}
};
</script>
<style>@import url('../../static/admin/admin.css');</style>
