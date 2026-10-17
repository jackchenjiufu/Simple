<template>
	<view class="ad-page">
		<admin-nav title="内容管理"></admin-nav>
		<scroll-view class="ad-body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<!-- 类型 Tab -->
			<view class="c-tabs">
				<view v-for="t in tabs" :key="t.key" class="c-tab" :class="{act: activeTab===t.key}" @click="switchTab(t.key)">{{ t.name }}</view>
			</view>

			<!-- 搜索 -->
			<view class="c-search">
				<input class="c-search-input" v-model="searchKey" placeholder="搜索标题/作者" placeholder-class="c-ph" confirm-type="search" @confirm="reload" />
				<text class="ad-btn ad-btn-primary c-search-btn" @click="reload">搜索</text>
			</view>

			<!-- 筛选 -->
			<view class="c-filters">
				<view class="c-filter" :class="{act: !category}" @click="category='';reload()">全部分类</view>
				<view class="c-filter" :class="{act: category===c}" v-for="c in categories" :key="c" @click="category=c;reload()">{{ c }}</view>
			</view>

			<!-- 排序：置顶固定顶部，其余正序/倒序 -->
			<view class="c-filters" style="margin-top:6rpx">
				<view class="c-filter" :class="{act: sortOrder==='desc'}" @click="sortOrder='desc';reload()">倒序 ▾</view>
				<view class="c-filter" :class="{act: sortOrder==='asc'}" @click="sortOrder='asc';reload()">正序 ▴</view>
				<text style="font-size:20rpx;color:#999;margin-left:auto;line-height:56rpx">置顶内容固定顶部</text>
			</view>

			<!-- 批量操作 -->
			<view class="c-toolbar">
				<text class="c-tool-btn" :class="{on: batchMode}" @click="toggleBatch">{{ batchMode ? '取消批量' : '批量' }}</text>
				<text v-if="batchMode" class="c-tool-tip">已选 {{ batchIds.length }} 项</text>
				<text v-if="batchMode && activeTab!=='trash'" class="c-tool-btn ok" @click="batchOp('safe')">通过</text>
				<text v-if="batchMode && activeTab!=='trash'" class="c-tool-btn warn" @click="batchOp('unsafe')">驳回</text>
				<text v-if="batchMode && activeTab!=='trash'" class="c-tool-btn danger" @click="batchOp('soft_delete')">删除</text>
				<text v-if="batchMode && activeTab==='trash'" class="c-tool-btn ok" @click="batchOp('restore')">恢复</text>
				<text v-if="batchMode && activeTab==='trash'" class="c-tool-btn danger" @click="batchOp('hard_delete')">彻底删</text>
				<text v-if="batchMode" class="c-tool-btn" @click="selAll">{{ allSel ? '取消全选' : '全选' }}</text>
			</view>

			<!-- 列表 -->
			<view v-if="loading && !list.length" class="ad-skeleton"><view class="ad-sk-line"></view><view class="ad-sk-line" style="width:70%"></view></view>
			<view class="ad-list" v-else-if="list.length">
				<view class="ad-item" v-for="row in list" :key="row.id" @click="batchMode ? toggleSel(row.id) : openDetail(row)">
					<view v-if="batchMode" class="c-sel" :class="{on: batchIds.includes(row.id)}">✓</view>
					<view class="ad-item-main">
						<text class="ad-item-title">{{ row.title || '(无标题)' }}</text>
						<text class="ad-item-sub">{{ (row.nickname || row.username || '用户#'+row.user_id) }} · {{ row.category || '未分类' }} · 赞{{ row.likes||0 }}</text>
						<view class="c-tags" v-if="tagList(row).length"><text class="ad-tag ad-tag-gray" v-for="t in tagList(row)" :key="t">{{ t }}</text></view>
					</view>
					<text v-if="row.is_pinned == 1" class="ad-tag ad-tag-red">置顶</text>
					<text class="ad-tag" :class="modClass(row.moderation_status)">{{ modLabel(row.moderation_status) }}</text>
					<view class="c-row-actions">
						<template v-if="activeTab==='trash'">
							<text class="ad-item-action" @click.stop="restore(row)">恢复</text>
							<text class="ad-item-danger" @click.stop="hardDel(row)">删除</text>
						</template>
						<template v-else>
							<text class="ad-item-action" :class="row.is_pinned == 1 ? 'ad-item-danger' : ''" @click.stop="pinContent(row)">{{ row.is_pinned == 1 ? '取消置顶' : '置顶' }}</text>
							<text class="ad-item-action" @click.stop="editMeta(row)">编辑</text>
							<text class="ad-item-action" @click.stop="setMod(row, row.moderation_status==='safe'?'unsafe':'safe')">{{ row.moderation_status==='safe'?'驳回':'通过' }}</text>
							<text class="ad-item-danger" @click.stop="softDel(row)">删除</text>
						</template>
					</view>
				</view>
				<view class="ad-loading">{{ hasMore ? '上拉加载更多' : (list.length ? '没有更多了' : '') }}</view>
			</view>
			<view class="ad-empty" v-else-if="!loading">{{ searchKey ? '未找到内容' : '暂无内容' }}</view>
		</scroll-view>

		<!-- 编辑标签/分类弹层 -->
		<view class="ad-mask" v-if="metaDlg" @click="metaDlg=false">
			<view class="ad-sheet" @click.stop>
				<view class="ad-sheet-head"><text>编辑标签与分类</text><text class="ad-close" @click="metaDlg=false">✕</text></view>
				<view class="ad-form-row"><text class="ad-form-label">标签</text><input class="ad-form-input" v-model="metaTagsText" placeholder="多个标签用逗号分隔" /></view>
				<view class="ad-form-row"><text class="ad-form-label">分类</text><input class="ad-form-input" v-model="metaCategoryText" placeholder="输入分类" /></view>
				<text class="ad-btn ad-btn-primary" @click="saveMeta">保存</text>
			</view>
		</view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
import AdminNav from '../../components/admin/AdminNav.vue';
export default {
	components: { AdminNav },
	data() {
		return {
			tabs: [{key:'image',name:'图片'},{key:'video',name:'视频'},{key:'trash',name:'回收站'}],
			activeTab: 'image', list: [], total: 0, page: 1, pageSize: 20,
			hasMore: false, loading: false, searchKey: '', category: '', categories: [], sortOrder: 'desc',
			batchMode: false, batchIds: [], allSel: false,
			metaDlg: false, metaRow: null, metaTagsText: '', metaCategoryText: ''
		};
	},
	methods: {
		async load() {
			this.loading = true;
			try {
				const params = { type: this.activeTab, page: this.page, limit: this.pageSize, sort: this.sortOrder };
				if (this.category) params.category = this.category;
				if (this.searchKey) params.search = this.searchKey;
				const r = await adminApi.getContentList(params);
				if (r.code === 200 && r.data) {
					this.list = this.page === 1 ? (r.data.list || r.data.rows || []) : this.list.concat(r.data.list || r.data.rows || []);
					this.total = r.data.total || this.total;
					this.hasMore = this.list.length < this.total;
					if (r.data.categories) this.categories = r.data.categories;
				} else { if (this.page === 1) this.list = []; }
			} catch(e) {} finally { this.loading = false; }
		},
		reload() { this.page = 1; this.list = []; this.load(); },
		loadMore() { if (!this.loading && this.hasMore) { this.page++; this.load(); } },
		switchTab(t) { this.activeTab = t; this.page = 1; this.list = []; this.batchIds = []; this.allSel = false; this.load(); },
		tagList(row) { const t = row.tags; if (!t) return []; if (Array.isArray(t)) return t; return String(t).split(',').map(x=>x.trim()).filter(Boolean); },
		modLabel(m) { return m==='safe'?'通过':(m==='unsafe'?'驳回':(m==='pending'?'待审':'未知')); },
		modClass(m) { return m==='safe'?'ad-tag-green':(m==='unsafe'?'ad-tag-red':'ad-tag-orange'); },
		toggleBatch() { this.batchMode = !this.batchMode; this.batchIds = []; this.allSel = false; },
		toggleSel(id) { const i = this.batchIds.indexOf(id); if (i>=0) this.batchIds.splice(i,1); else this.batchIds.push(id); },
		selAll() { this.allSel = !this.allSel; this.batchIds = this.allSel ? this.list.map(x=>x.id) : []; },
		async batchOp(op) {
			if (!this.batchIds.length) { uni.showToast({title:'请先选择',icon:'none'}); return; }
			uni.showLoading({ title: '处理中' });
			try { const r = await adminApi.batchContent(this.batchIds, op); uni.hideLoading(); if (r.code===200) { uni.showToast({title:(r.message)||'完成',icon:'none'}); this.batchMode=false; this.batchIds=[]; this.reload(); } else uni.showToast({title:r.message,icon:'none'}); } catch(e){ uni.hideLoading(); }
		},
		editMeta(row) { this.metaRow = row; this.metaTagsText = this.tagList(row).join(','); this.metaCategoryText = row.category || ''; this.metaDlg = true; },
		pinContent(row) {
			const pinned = row.is_pinned == 1 ? 0 : 1;
			uni.showModal({
				title: pinned ? '置顶主推' : '取消置顶',
				content: pinned ? `将 #${row.id}「${row.title || ''}」置顶到推荐流最前（所有用户可见）。确定？` : `取消 #${row.id} 的置顶？`,
				success: async (res) => {
					if (!res.confirm) return;
					try {
						const r = await adminApi.pinContent(row.id, pinned);
						if (r.code === 200) { uni.showToast({ title: r.message || (pinned ? '已置顶' : '已取消置顶'), icon: 'none' }); this.reload(); }
						else uni.showToast({ title: r.message || '操作失败', icon: 'none' });
					} catch(e) { uni.showToast({ title: '操作失败', icon: 'none' }); }
				}
			});
		},
		async saveMeta() {
			if (!this.metaRow) return;
			try { const r = await adminApi.updateContentMeta({ id: this.metaRow.id, tags: this.metaTagsText, category: this.metaCategoryText, recommended: this.metaRow.recommended }); if (r.code===200) { uni.showToast({title:'已保存',icon:'none'}); this.metaDlg=false; this.reload(); } } catch(e) {}
		},
		async setMod(row, status) {
			try { const r = await adminApi.setContentModeration(row.id, status); if (r.code===200) { uni.showToast({title:'已更新',icon:'none'}); row.moderation_status = status; } } catch(e) {}
		},
		softDel(row) { uni.showModal({ title:'删除', content:'移到回收站？', success: async (res)=>{ if(res.confirm){ try{ const r=await adminApi.deleteContent(row.id); if(r.code===200){uni.showToast({title:r.message,icon:'none'});this.reload();} }catch(e){} } } }); },
		hardDel(row) { uni.showModal({ title:'彻底删除', content:'将物理删除，不可恢复！', success: async (res)=>{ if(res.confirm){ try{ const r=await adminApi.deleteContent(row.id, true); if(r.code===200){uni.showToast({title:r.message,icon:'none'});this.reload();} }catch(e){} } } }); },
		restore(row) { uni.showModal({ title:'恢复', content:'确定恢复该内容？', success: async (res)=>{ if(res.confirm){ try{ const r=await adminApi.restoreContent(row.id); if(r.code===200){uni.showToast({title:r.message,icon:'none'});this.reload();} }catch(e){} } } }); },
		openDetail(row) { uni.showModal({ title: row.title || '内容详情', content: 'ID:'+row.id+' | 分类:'+(row.category||'-')+' | 发布:'+(row.user_id||'-'), showCancel: false }); }
	}
};
</script>
<style>
@import url('../../static/admin/admin.css');
.c-tabs { display:flex; background:#fff; border-radius:16upx; padding:8upx; margin-bottom:16upx; box-shadow:0 2upx 10upx rgba(0,0,0,.04); }
.c-tab { flex:1; text-align:center; padding:16upx 0; font-size:28upx; color:#666; border-radius:12upx; }
.c-tab.act { background:#2f6bf0; color:#fff; font-weight:600; }
.c-search { display:flex; align-items:center; background:#fff; border-radius:999upx; padding:12upx 12upx 12upx 24upx; margin-bottom:16upx; box-shadow:0 2upx 10upx rgba(0,0,0,.04); }
.c-search-input { flex:1; font-size:28upx; }
.c-ph { color:#b0b3b8; }
.c-search-btn { flex:none; padding:0 28upx; height:64upx; line-height:64upx; font-size:26upx; }
.c-filters { display:flex; flex-wrap:wrap; margin-bottom:16upx; }
.c-filter { font-size:24upx; color:#666; background:#fff; padding:8upx 20upx; border-radius:999upx; margin:0 12upx 12upx 0; }
.c-filter.act { color:#fff; background:#2f6bf0; }
.c-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12upx; margin-bottom:16upx; }
.c-tool-btn { font-size:24upx; color:#2f6bf0; background:#fff; padding:10upx 22upx; border-radius:999upx; }
.c-tool-btn.on { background:#2f6bf0; color:#fff; }
.c-tool-btn.ok { color:#fff; background:#00a862; }
.c-tool-btn.warn { color:#fff; background:#ff7d00; }
.c-tool-btn.danger { color:#fff; background:#f56c6c; }
.c-tool-tip { font-size:24upx; color:#666; }
.c-sel { width:36upx; height:36upx; border:2upx solid #cbd5e1; border-radius:8upx; margin-right:16upx; display:flex; align-items:center; justify-content:center; font-size:24upx; color:transparent; flex-shrink:0; }
.c-sel.on { background:#2f6bf0; color:#fff; border-color:#2f6bf0; }
.c-tags { display:flex; flex-wrap:wrap; gap:8upx; margin-top:8upx; }
.c-row-actions { display:flex; flex-direction:column; align-items:flex-end; gap:8upx; flex-shrink:0; margin-left:16upx; }
.ad-mask { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:999; display:flex; align-items:flex-end; }
.ad-sheet { width:100%; background:#fff; border-radius:24upx 24upx 0 0; padding:24upx 32upx 40upx; box-sizing:border-box; }
.ad-sheet-head { display:flex; justify-content:space-between; align-items:center; font-size:30upx; font-weight:600; margin-bottom:20upx; }
.ad-close { font-size:28upx; color:#999; padding:4upx 8upx; }
.ad-form-row { display:flex; align-items:center; margin-bottom:20upx; }
.ad-form-label { width:120upx; font-size:28upx; color:#666; }
.ad-form-input { flex:1; height:72upx; background:#f5f6fa; border-radius:12upx; padding:0 20upx; font-size:28upx; }
</style>
