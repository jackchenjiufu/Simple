<template>
	<view class="ad-page">
		<admin-nav title="API 管理"></admin-nav>
		<scroll-view class="ad-body" scroll-y="true" show-scrollbar="false">
			<view class="ad-sec">API 版本</view>
			<view class="ad-card">
				<view class="ad-row">
					<text class="ad-label">当前版本</text>
					<text class="ad-value">{{ apiVersion }}</text>
				</view>
				<view class="ad-row">
					<text class="ad-label">切换到</text>
					<view class="ad-row" style="border:none;padding:0">
						<text class="ad-item-action" @click="switchVer('v1')">v1（无版本段）</text>
						<text class="ad-item-action" @click="switchVer('v2')">v2（/api/v2/）</text>
						<text class="ad-item-action" @click="switchVer('v3')">v3（/api/v3/ Node）</text>
					</view>
				</view>
			</view>

			<view class="ad-sec">v2 转发接口</view>
			<view class="ad-card">
				<view v-if="v2.length" class="ad-item" v-for="it in v2" :key="it.file">
					<view class="ad-item-main">
						<text class="ad-item-title">{{ it.file }}</text>
						<text class="ad-item-sub">{{ it.status }}</text>
					</view>
					<text class="ad-item-danger" @click="delV2(it.file)">删除</text>
				</view>
				<view v-else class="ad-empty">暂无 v2 接口</view>
			</view>

			<view class="ad-sec">接口文档（{{ docs.length }} 个）</view>
			<view class="ad-card">
				<view v-if="docs.length" class="ad-item" v-for="d in docs" :key="d.id || d.file || d.method + d.path">
					<view class="ad-item-main">
						<text class="ad-item-title">{{ d.method || 'GET' }} {{ d.path || d.file || d.name }}</text>
						<text class="ad-item-sub" v-if="d.desc || d.description">{{ d.desc || d.description }}</text>
					</view>
				</view>
				<view v-else class="ad-empty">暂无接口文档</view>
			</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
import AdminNav from '../../components/admin/AdminNav.vue';
export default {
	components: { AdminNav },
	data() { return { apiVersion: '1', v2: [], docs: [] }; },
	onLoad() { this.load(); },
	methods: {
		async load() {
			try {
				const [ver, v2r, docr] = await Promise.all([
					adminApi.getApiVersion(), adminApi.getV2Apis(), adminApi.getVersionDocs()
				]);
				let verStr = 'v1';
				if (ver && ver.code === 200) {
					verStr = (ver.data && (ver.data.version || ver.data.api_version || 'v1')) || 'v1';
				}
				this.apiVersion = verStr;
				if (v2r && v2r.code === 200) this.v2 = v2r.data || [];
				// 接口文档：按当前生效版本展示（docs/vN.json，V3 = 87 个 Node 接口）
				const docsAll = (docr && docr.data && docr.data.docs) || {};
				this.docs = docsAll[verStr] || [];
			} catch(e) {}
		},
		switchVer(v) {
			uni.showModal({ title: '切换版本', content: '确定切换到 API ' + v + '？切换后前端实时生效。', success: async (res) => {
				if (!res.confirm) return;
				try { const r = await adminApi.switchApiVersion(v); if (r.code === 200) { uni.showToast({ title: r.message, icon: 'none' }); this.apiVersion = v; } } catch(e) {}
			}});
		},
		delV2(file) {
			uni.showModal({ title: '删除', content: '删除 v2 转发 ' + file + '？', success: async (res) => {
				if (!res.confirm) return;
				try { const r = await adminApi.deleteV2Api(file); if (r.code === 200) { uni.showToast({ title: r.message, icon: 'none' }); this.load(); } } catch(e) {}
			}});
		}
	}
};
</script>
<style>@import url('../../static/admin/admin.css');</style>
