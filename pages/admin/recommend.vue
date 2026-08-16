<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack"><image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image></view>
			<text class="nav-title">内容推荐</text>
			<view class="nav-placeholder"></view>
		</view>
		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="section-title">推荐概览</view>
			<view class="info-card" v-if="overview">
				<view class="info-row"><text class="info-label">图片内容</text><text class="info-value">{{ overview.total }}（参与推荐 {{ overview.recommended_on }}）</text></view>
				<view class="info-row"><text class="info-label">点击行为</text><text class="info-value">{{ overview.behavior_count }}</text></view>
				<view class="info-row"><text class="info-label">活跃用户</text><text class="info-value">{{ overview.behavior_users }}</text></view>
				<view class="info-row"><text class="info-label">点击率 CTR</text><text class="info-value" style="color:#2f6bf0">{{ overview.ctr }}%</text></view>
				<view class="info-row"><text class="info-label">算法</text><text class="info-value">{{ overview.algorithm ? overview.algorithm.name : '-' }}</text></view>
				<view class="info-row" v-if="overview.algorithm"><text class="info-label">版本</text><text class="info-value">{{ overview.algorithm.version }}（{{ overview.algorithm.weights }}）</text></view>
			</view>
			<view class="section-title">热门 TOP5</view>
			<view class="list-card" v-if="hot.length">
				<view class="list-item" v-for="(h, i) in hot" :key="h.id">
					<text class="rank">{{ i + 1 }}</text>
					<text class="list-main">{{ h.title || '(无标题)' }}</text>
					<text class="list-sub">{{ h.click_cnt }} 次点击</text>
				</view>
			</view>
			<view class="section-title">推荐池（前 10）</view>
			<view class="list-card" v-if="contents.length">
				<view class="list-item" v-for="c in contents" :key="c.id">
					<view class="list-main-wrap">
						<text class="list-main">{{ c.title || '(无标题)' }}</text>
						<text class="list-sub">{{ c.click_cnt }} 点击</text>
						<text v-if="safeTags(c.tags).length" class="list-tags">{{ safeTags(c.tags).join(' · ') }}</text>
					</view>
					<view class="list-actions">
						<text class="list-ai" v-if="tagging !== c.id" @click="tagOne(c)">AI 打标</text>
						<text class="list-ai loading" v-else>打标中…</text>
						<text class="list-toggle" :style="{color: c.recommended == 1 ? '#2f6bf0' : '#999'}" @click="toggle(c)">{{ c.recommended == 1 ? '在池' : '移出' }}</text>
					</view>
				</view>
			</view>
			<view class="empty" v-else>暂无内容</view>

			<view class="section-title">相似图片组（按类别分组）</view>
			<view class="group-summary" v-if="groups">
				<text>共 {{ groups.total_categories }} 类 · {{ groups.total_items }} 张图片</text>
			</view>
			<view class="group-card" v-for="g in groups.groups" :key="g.category">
				<view class="group-head">
					<text class="group-title">{{ g.category }}（{{ g.size }} 张）</text>
					<view class="group-tags">
						<text class="group-tag">推荐 {{ g.recommended_count }}</text>
						<text class="group-tag hot">点击 {{ g.click_total }}</text>
					</view>
				</view>
				<view class="group-imgs">
					<view class="g-img" v-for="it in g.items" :key="it.id">
						<image class="g-thumb" :src="it.image_url" mode="aspectFill"></image>
						<text class="g-name">{{ it.title }}</text>
						<text class="g-click">点击 {{ it.click_cnt }}</text>
					</view>
				</view>
			</view>
			<view class="empty" v-if="groups && (!groups.groups || !groups.groups.length)">暂无内容</view>

			<view class="section-title">视觉指纹去重（pHash 同源图识别）</view>
			<view class="group-summary" v-if="fp">
				<text>指纹 {{ fp.total_fingerprints }} · 同源组 {{ fp.groups.length }} · 未分组 {{ fp.ungrouped }}</text>
			</view>
			<view class="group-card" v-for="g in fp.groups" :key="'fp' + g.group_id">
				<view class="group-head">
					<text class="group-title">同源组 {{ g.group_id }}（{{ g.size }} 张）</text>
					<view class="group-tags">
						<text class="group-tag" :class="{ hot: g.recommended_count > 1 }">{{ g.recommended_count > 1 ? (g.recommended_count + ' 张在推荐池') : '已去重' }}</text>
						<text class="group-tag act" v-if="g.recommended_count > 1" @click="dedupGroup(g.group_id)">一键去重</text>
					</view>
				</view>
				<view class="group-imgs">
					<view class="g-img" v-for="it in g.items" :key="it.id">
						<image class="g-thumb" :src="it.image_url" mode="aspectFill"></image>
						<text class="g-name">{{ it.title }}</text>
						<text class="g-rec" :class="it.recommended ? 'on' : ''">{{ it.recommended ? '推荐中' : '已移出' }}</text>
					</view>
				</view>
				<view class="group-pairs" v-if="g.pairs.length">
					<view class="pair-row" v-for="(p, pi) in g.pairs" :key="'p' + pi">
						<text class="pair-name">{{ fpNameOf(g, p.a) }} ↔ {{ fpNameOf(g, p.b) }}</text>
						<text class="pair-sim" :style="{color: p.similarity >= 90 ? '#e64340' : '#2f6bf0'}">{{ p.similarity }}%</text>
					</view>
				</view>
			</view>
			<view class="empty" v-if="fp && (!fp.groups || !fp.groups.length)">暂无同源图组（cron 每小时增量，每天 4:20 SIFT 复核）</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
export default {
	data() { return { statusBarHeight: 0, overview: null, hot: [], contents: [], groups: null, fp: null, tagging: 0 }; },
	onLoad() { const si = uni.getSystemInfoSync(); this.statusBarHeight = si.statusBarHeight || 0; this.load(); },
	methods: {
		goBack() { uni.navigateBack(); },
		safeTags(raw) {
			if (!raw) return [];
			if (Array.isArray(raw)) return raw;
			try { const j = JSON.parse(raw); return Array.isArray(j) ? j : []; } catch(e) { return []; }
		},
		async tagOne(c) {
			this.tagging = c.id;
			try {
				const r = await adminApi.tagContent(c.id);
				if (r.code === 200) {
					uni.showToast({ title: '已打标：' + r.data.category, icon: 'none' });
					c.category = r.data.category;
					c.tags = JSON.stringify(r.data.tags || []);
					this.load();
				} else {
					uni.showToast({ title: r.message || '打标失败', icon: 'none' });
				}
			} catch(e) { uni.showToast({ title: '打标失败', icon: 'none' }); }
			this.tagging = 0;
		},
		async load() {
			try { const r = await adminApi.getRecommendOverview(); if (r.code === 200) { this.overview = r.data; this.hot = (r.data.hot_top || []).slice(0, 5); } } catch(e) {}
			try { const r = await adminApi.getRecommendContents({ limit: 10 }); if (r.code === 200) this.contents = r.data.items || []; } catch(e) {}
			try { const r = await adminApi.getRecommendGroups(); if (r.code === 200) this.groups = r.data; } catch(e) {}
			try { const r = await adminApi.getRecommendFingerprints(); if (r.code === 200) this.fp = r.data; } catch(e) {}
		},
		fpNameOf(g, id) {
			const it = (g.items || []).find(x => x.id === id);
			return it ? it.title : ('#' + id);
		},
		dedupGroup(gid) {
			uni.showModal({
				title: '一键去重',
				content: '组内保留点击最高的 1 张，其余同源图移出推荐池。确定执行？',
				confirmColor: '#e64340',
				success: async (res) => {
					if (!res.confirm) return;
					try {
						const r = await adminApi.dedupFingerprintGroup(gid);
						uni.showToast({ title: r.message || '去重完成', icon: 'none' });
						this.load();
					} catch(e) { uni.showToast({ title: '去重失败', icon: 'none' }); }
				}
			});
		},
		async toggle(c) {
			const target = c.recommended == 1 ? 0 : 1;
			try { const r = await adminApi.toggleRecommend(c.id, target); if (r.code === 200) { uni.showToast({ title: r.message, icon: 'none' }); c.recommended = target; this.load(); } } catch(e) {}
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
.info-card { background: #fff; margin: 0 24upx; border-radius: 16upx; padding: 8upx 24upx; }
.info-row { display: flex; justify-content: space-between; padding: 14upx 0; border-bottom: 1px solid #f7f8fa; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26upx; color: #666; }
.info-value { font-size: 26upx; color: #333; font-weight: 500; }
.list-card { background: #fff; margin: 0 24upx; border-radius: 16upx; overflow: hidden; }
.list-item { display: flex; align-items: center; padding: 18upx 24upx; border-bottom: 1px solid #f7f8fa; }
.list-item:last-child { border-bottom: none; }
.rank { width: 40upx; font-size: 26upx; color: #2f6bf0; font-weight: 700; }
.list-main { flex: 1; font-size: 26upx; color: #333; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.list-main-wrap { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.list-tags { font-size: 20upx; color: #909399; margin-top: 4upx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.list-actions { display: flex; align-items: center; gap: 20upx; margin-left: 16upx; }
.list-ai { font-size: 24upx; color: #2f6bf0; }
.list-ai.loading { color: #c0c4cc; }
.list-sub { font-size: 22upx; color: #999; margin-right: 16upx; }
.list-toggle { font-size: 24upx; }
.empty { text-align: center; color: #999; font-size: 26upx; padding: 40upx 0; }
.group-summary { font-size: 22upx; color: #909399; margin: 0 24upx 12upx; }
.group-card { background: #fff; margin: 0 24upx 16upx; border-radius: 16upx; padding: 20upx 24upx; }
.group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14upx; }
.group-title { font-size: 28upx; font-weight: 600; color: #1a1a2e; }
.group-tags { display: flex; gap: 8upx; }
.group-tag { font-size: 20upx; color: #fff; background: #2f6bf0; border-radius: 8upx; padding: 4upx 12upx; }
.group-tag.hot { background: #ff9f2e; }
.group-tag.act { background: #e64340; }
.group-imgs { display: flex; flex-wrap: wrap; gap: 12upx; }
.g-img { width: 160upx; }
.g-thumb { width: 160upx; height: 160upx; border-radius: 10upx; background: #f0f2f5; }
.g-name { display: block; font-size: 20upx; color: #666; margin-top: 6upx; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.g-click { display: block; font-size: 18upx; color: #999; margin-top: 2upx; }
.g-rec { display: block; font-size: 18upx; color: #999; margin-top: 2upx; }
.g-rec.on { color: #00a862; }
.group-pairs { margin-top: 14upx; border-top: 1px solid #f5f6fa; padding-top: 10upx; }
.pair-row { display: flex; justify-content: space-between; align-items: center; padding: 8upx 0; }
.pair-name { font-size: 22upx; color: #555; flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.pair-sim { font-size: 24upx; font-weight: 600; margin-left: 16upx; }
</style>
