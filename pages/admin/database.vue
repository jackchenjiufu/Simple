<template>
	<view class="ad-page">
		<admin-nav :title="detail ? ('表：' + detail) : '数据库管理'"></admin-nav>
		<scroll-view class="ad-body" scroll-y="true" show-scrollbar="false" @scrolltolower="detail && loadRows(true)">
			<template v-if="!detail">
				<view class="ad-sec">数据库概览</view>
				<view class="ad-card" v-if="info">
					<view class="ad-row"><text class="ad-label">数据库</text><text class="ad-value">{{ info.database }}</text></view>
					<view class="ad-row"><text class="ad-label">MySQL</text><text class="ad-value">{{ info.version }}</text></view>
					<view class="ad-row"><text class="ad-label">数据表</text><text class="ad-value">{{ info.table_count }} 张</text></view>
					<view class="ad-row"><text class="ad-label">数据 / 索引</text><text class="ad-value">{{ formatSize(info.total_data) }} / {{ formatSize(info.total_index) }}</text></view>
				</view>
				<text class="ad-item-action" style="margin:0 4upx 12upx;display:inline-block" @click="loadOverview">刷新</text>
				<view class="ad-sec">数据表（{{ tables.length }}）</view>
				<view class="ad-list" v-if="tables.length">
					<view class="ad-item" v-for="t in tables" :key="t.name" @click="openTable(t.name)">
						<view class="ad-item-main">
							<text class="ad-item-title">{{ t.name }}</text>
							<text class="ad-item-sub">{{ t.rows }} 行 · {{ formatSize(t.data_size) }}</text>
						</view>
						<text class="ad-item-action">查看 ›</text>
					</view>
				</view>
				<view class="ad-empty" v-else>暂无数据</view>
			</template>
			<template v-else>
				<text class="ad-item-action" style="margin:0 4upx 16upx;display:inline-block" @click="backList">‹ 返回表列表</text>
				<view class="ad-sec">字段结构（{{ columns.length }}）</view>
				<view class="ad-card">
					<view class="ad-item" v-for="c in columns" :key="c.Field || c.name">
						<view class="ad-item-main">
							<text class="ad-item-title">{{ c.Field || c.name }}</text>
							<text class="ad-item-sub">{{ c.Type || c.type || '' }}<text v-if="c.Key==='PRI'||c.Key==='PRI'"> · 主键</text></text>
						</view>
						<text class="ad-tag ad-tag-gray">{{ (c.Null==='NO') ? '非空' : '可空' }}</text>
					</view>
					<view class="ad-empty" v-if="!columns.length">加载字段中...</view>
				</view>
				<view class="ad-sec">数据（共 {{ rowTotal }} 行）</view>
				<view class="ad-list" v-if="rows.length">
					<view class="ad-item" v-for="(row, ri) in rows" :key="ri" @click="rowDetail(row)">
						<view class="ad-item-main">
							<text class="ad-item-sub" v-for="(v, k) in pickRow(row)" :key="k">{{ k }}: {{ v }}</text>
						</view>
					</view>
					<view class="ad-loading">{{ hasMore ? '上拉加载更多' : (rows.length ? '共 ' + rowTotal + ' 行' : '') }}</view>
				</view>
				<view class="ad-empty" v-else>无数据</view>
			</template>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
import AdminNav from '../../components/admin/AdminNav.vue';
export default {
	components: { AdminNav },
	data() {
		return { info: null, tables: [], detail: '', columns: [], rows: [], rowPage: 1, rowTotal: 0, hasMore: false, loadingRows: false };
	},
	onLoad() { this.loadOverview(); },
	methods: {
		formatSize(b) { if (b == null) return '-'; if (b < 1024) return b + 'B'; if (b < 1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; },
		async loadOverview() { try { const r = await adminApi.getDbOverview(); if (r.code === 200) { this.info = r.data; this.tables = r.data.tables || []; } } catch(e) {} },
		async openTable(name) {
			this.detail = name; this.columns = []; this.rows = []; this.rowPage = 1; this.rowTotal = 0; this.hasMore = false;
			try { const r = await adminApi.getDbStructure(name); if (r.code === 200 && r.data) this.columns = r.data.rows || r.data.columns || (Array.isArray(r.data) ? r.data : []); } catch(e) {}
			this.loadRows(false);
		},
		backList() { this.detail = ''; this.loadOverview(); },
		async loadRows(more) {
			if (this.loadingRows) return;
			if (more && !this.hasMore) return;
			if (!more) { this.rowPage = 1; this.rows = []; }
			this.loadingRows = true;
			try {
				const r = await adminApi.getDbTables({ table: this.detail, page: this.rowPage, limit: 20 });
				if (r.code === 200 && r.data) {
					this.rows = more ? this.rows.concat(r.data.rows || []) : (r.data.rows || []);
					this.rowTotal = r.data.total || 0;
					this.hasMore = this.rows.length < this.rowTotal;
					if (this.hasMore) this.rowPage++;
				}
			} catch(e) {} finally { this.loadingRows = false; }
		},
		pickRow(row) { const o = {}; Object.keys(row).slice(0,5).forEach(k => { o[k] = String(row[k]).slice(0,40); }); return o; },
		rowDetail(row) { uni.showModal({ title: '行数据', content: Object.keys(row).map(k => k + ': ' + String(row[k]).slice(0,80)).join(String.fromCharCode(10)), showCancel: false }); }
	}
};
</script>
<style>@import url('../../static/admin/admin.css');</style>
