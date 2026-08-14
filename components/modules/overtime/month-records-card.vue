<template>
	<view class="card">
		<view class="card-title-row" @click="$emit('toggle')">
			<text class="card-title">本月记录</text>
			<text class="card-toggle">{{ open ? '收起' : '展开' }}</text>
		</view>
		<view v-if="open">
			<view class="record-item" v-for="(r, i) in records" :key="i">
				<view class="record-left">
					<text class="record-date">{{ r.date.substr(5) }}</text>
					<text class="record-note">{{ r.note || '-' }}</text>
				</view>
				<view class="record-right">
					<text class="record-tag" :class="r.type === 'comp' ? 'tag-comp' : 'tag-overtime'">{{ r.type === 'comp' ? '调休' : '加班' }}</text>
					<text class="record-hours">{{ r.hours }}h</text>
					<text class="record-salary" v-if="r.type !== 'comp'">¥{{ r.salary }}</text>
					<text class="record-edit" @click="$emit('edit', r)">编辑</text>
					<text class="record-delete" @click="$emit('delete', r)">删除</text>
				</view>
			</view>
			<view class="empty" v-if="records.length === 0"><text>暂无记录</text></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'MonthRecordsCard',
	props: {
		records: { type: Array, default: () => [] },
		open: { type: Boolean, default: true }
	}
};
</script>

<style scoped>
.card { width:100%; box-sizing:border-box; background:#fff; border-radius:20upx; padding:0 24upx; margin-bottom:20upx; box-shadow:0 2upx 12upx rgba(0,0,0,0.04); }
.card-title-row { display:flex; justify-content:space-between; align-items:center; padding:24upx 0; }
.card-title { display:block; font-size:28upx; font-weight:600; color:#303132; }
.card-toggle { font-size:24upx; color:#909398; }
.record-item { display:flex; justify-content:space-between; align-items:center; padding:20upx 0; border-bottom:1px solid #f3f4f6; }
.record-left { display:flex; flex-direction:column; gap:4upx; }
.record-date { font-size:26upx; font-weight:600; color:#303132; }
.record-note { font-size:22upx; color:#909398; }
.record-right { display:flex; align-items:center; gap:12upx; }
.record-tag { font-size:20upx; padding:4upx 12upx; border-radius:8upx; }
.tag-overtime { background:#eff6ff; color:#3071f6; }
.tag-comp { background:#fef3c7; color:#b45309; }
.record-hours { font-size:24upx; font-weight:600; color:#303132; }
.record-salary { font-size:24upx; font-weight:600; color:#e64340; }
.record-edit { font-size:22upx; color:#3071f6; }
.record-delete { font-size:22upx; color:#e64340; }
.empty { text-align:center; padding:32upx 0; color:#909398; font-size:24upx; }
</style>
