<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">文档中心</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<view class="card">
				<text class="card-title">项目简介</text>
				<text class="card-text">Origin 是一个内容分享与社交平台，提供个性化推荐、用户互动、内容发布等功能。</text>
			</view>

			<view class="card">
				<text class="card-title">系统架构</text>
				<view class="info-row"><text class="info-label">前端</text><text class="info-value">Vue 3 + uni-app</text></view>
				<view class="info-row"><text class="info-label">后端</text><text class="info-value">PHP + MySQL</text></view>
				<view class="info-row noborder"><text class="info-label">状态管理</text><text class="info-value">Vuex</text></view>
			</view>

			<view class="card">
				<text class="card-title">目录结构</text>
				<view class="dir-item"><text class="dir-name">pages/</text><text class="dir-desc">页面文件</text></view>
				<view class="dir-item"><text class="dir-name">components/</text><text class="dir-desc">通用组件</text></view>
				<view class="dir-item"><text class="dir-name">server/</text><text class="dir-desc">后端 API</text></view>
				<view class="dir-item"><text class="dir-name">static/</text><text class="dir-desc">静态资源</text></view>
				<view class="dir-item"><text class="dir-name">store/</text><text class="dir-desc">状态管理</text></view>
				<view class="dir-item noborder"><text class="dir-name">utils/</text><text class="dir-desc">工具函数</text></view>
			</view>

			<view class="card">
				<text class="card-title">核心功能</text>
				<view class="tag-row">
					<text class="tag" v-for="t in features" :key="t">{{ t }}</text>
				</view>
			</view>

			<view class="card">
				<text class="card-title">API 接口</text>
				<view class="api-group" v-for="group in apiDocs" :key="group.title">
					<text class="api-group-title">{{ group.title }}</text>
					<view class="api-item" v-for="api in group.items" :key="api.url">
						<text class="method" :class="api.method">{{ api.method }}</text>
						<text class="api-url">{{ api.url }}</text>
						<text class="api-desc">{{ api.desc }}</text>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			features: ['个性化推荐', '用户管理', '内容发布', '社交互动', '数据统计', '文件管理'],
			apiDocs: [
				{ title: '用户', items: [
					{ method: 'GET', url: '/api/user_profile.php?action=recommendations', desc: '获取个性化推荐' },
					{ method: 'POST', url: '/api/login.php', desc: '用户登录' },
					{ method: 'POST', url: '/api/register.php', desc: '用户注册' },
				]},
				{ title: '内容', items: [
					{ method: 'GET', url: '/api/content.php', desc: '获取内容列表' },
					{ method: 'POST', url: '/api/upload_image.php', desc: '上传图片' },
				]},
				{ title: '系统', items: [
					{ method: 'POST', url: '/api/check_update.php', desc: '检查更新' },
					{ method: 'POST', url: '/api/overtime.php', desc: '加班记录' },
				]},
			]
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
	},
	methods: { goBack() { uni.navigateBack(); } }
}
</script>

<style>
.content { min-height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
.body { flex: 1; padding: 24upx; }

.card { background: #ffffff; border-radius: 16upx; padding: 28upx 24upx; margin-bottom: 20upx; box-shadow: 0 2upx 12upx rgba(0,0,0,0.04); }
.card-title { display: block; font-size: 28upx; font-weight: 600; color: #1b44a6; margin-bottom: 16upx; }
.card-text { font-size: 26upx; color: #6b7280; line-height: 1.7; }

.info-row { display: flex; padding: 16upx 0; border-bottom: 1px solid #f5f5f5; }
.info-row.noborder { border-bottom: none; }
.info-label { width: 140upx; font-size: 26upx; color: #303132; font-weight: 500; flex-shrink: 0; }
.info-value { font-size: 26upx; color: #6b7280; }

.dir-item { display: flex; padding: 14upx 0; border-bottom: 1px solid #f5f5f5; }
.dir-item.noborder { border-bottom: none; }
.dir-name { font-size: 26upx; color: #3071f6; font-weight: 500; width: 200upx; flex-shrink: 0; font-family: monospace; }
.dir-desc { font-size: 26upx; color: #6b7280; }

.tag-row { display: flex; flex-wrap: wrap; gap: 12upx; }
.tag { font-size: 24upx; color: #3071f6; background: #eff6ff; padding: 8upx 20upx; border-radius: 8upx; }

.api-group { margin-bottom: 24upx; }
.api-group:last-child { margin-bottom: 0; }
.api-group-title { display: block; font-size: 24upx; font-weight: 500; color: #909398; margin-bottom: 12upx; }
.api-item { display: flex; align-items: center; gap: 12upx; padding: 12upx 0; border-bottom: 1px solid #f5f5f5; flex-wrap: wrap; }
.api-item:last-child { border-bottom: none; }
.method { font-size: 20upx; font-weight: 700; padding: 4upx 12upx; border-radius: 6upx; flex-shrink: 0; }
.method.GET { background: #ecfdf5; color: #10b981; }
.method.POST { background: #eff6ff; color: #3071f6; }
.method.DELETE { background: #fef2f2; color: #ef4444; }
.api-url { font-size: 22upx; color: #303132; font-family: monospace; flex: 1; min-width: 200upx; word-break: break-all; }
.api-desc { font-size: 22upx; color: #909398; width: 100%; }
</style>
