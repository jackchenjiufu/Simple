<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">加班管理</text>
			<view class="nav-action" @click="openAdd">＋新增</view>
		</view>

		<!-- 月度汇总 -->
		<view class="summary-bar" v-if="monthly.length">
			<scroll-view scroll-x="true" show-scrollbar="false" class="summary-scroll">
				<view class="summary-item" v-for="m in monthly" :key="m.ym">
					<text class="summary-month">{{ m.ym }}</text>
					<text class="summary-ot">加班 {{ m.ot_hours || 0 }}h</text>
					<text class="summary-comp">调休 {{ m.comp_hours || 0 }}h</text>
				</view>
			</scroll-view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="ot-item" v-for="r in records" :key="r.id">
				<view class="ot-info">
					<view class="ot-title-row">
						<text class="ot-user">{{ r.nickname || r.username || '用户#' + r.user_id }}</text>
						<text class="ot-type" :class="r.type === 'overtime' ? 't-ot' : 't-comp'">{{ r.type === 'overtime' ? '加班' : '调休' }}</text>
					</view>
					<text class="ot-date">{{ r.date }} · {{ r.hours }}h · {{ r.multiplier }}x</text>
					<text class="ot-note" v-if="r.note">{{ r.note }}</text>
				</view>
				<view class="ot-salary">
					<text class="salary-num">¥{{ r.salary || 0 }}</text>
					<text class="salary-label">薪资</text>
				</view>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !records.length">暂无加班记录</view>
		</scroll-view>

		<!-- 新增弹层 -->
		<view class="mask" v-if="showAdd" @click="showAdd = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">新增记录</text>
					<text class="sheet-close" @click="showAdd = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">用户 ID</text>
					<input class="form-input" v-model="addForm.user_id" type="number" placeholder="用户数字ID" />
				</view>
				<view class="form-group">
					<text class="form-label">日期</text>
					<picker mode="date" :value="addForm.date" @change="e => addForm.date = e.detail.value">
						<view class="picker-box">{{ addForm.date || '选择日期' }}</view>
					</picker>
				</view>
				<view class="form-group">
					<text class="form-label">类型</text>
					<view class="type-select">
						<view class="type-option" :class="{ active: addForm.type === 'overtime' }" @click="addForm.type = 'overtime'">加班</view>
						<view class="type-option" :class="{ active: addForm.type === 'comp' }" @click="addForm.type = 'comp'">调休</view>
					</view>
				</view>
				<view class="form-group">
					<text class="form-label">时长（小时）</text>
					<input class="form-input" v-model="addForm.hours" type="digit" placeholder="如 2.5" />
				</view>
				<view class="form-group">
					<text class="form-label">倍率</text>
					<input class="form-input" v-model="addForm.multiplier" type="digit" placeholder="如 1.5 / 2.0" />
				</view>
				<view class="form-group">
					<text class="form-label">时薪</text>
					<input class="form-input" v-model="addForm.rate" type="digit" placeholder="如 15.29" />
				</view>
				<view class="form-group">
					<text class="form-label">备注</text>
					<input class="form-input" v-model="addForm.note" placeholder="选填" />
				</view>
				<button class="btn-primary" @click="handleAdd">保存</button>
			</view>
		</view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			records: [],
			monthly: [],
			loading: false,
			showAdd: false,
			addForm: { user_id: '', date: '', type: 'overtime', hours: '', multiplier: '1.5', rate: '', note: '' },
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadData() {
			this.loading = true;
			// 列表模式：后端返回 data 是记录数组
			adminApi.getOvertime('list').then(res => {
				if (res.code === 200) {
					this.records = Array.isArray(res.data) ? res.data : (res.data?.records || []);
				}
			}).catch(() => {});
			// 汇总模式：type=chart 返回 monthly + ranking
			adminApi.getOvertime('chart').then(res => {
				if (res.code === 200) {
					this.monthly = res.data?.monthly || [];
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		openAdd() {
			const today = new Date();
			const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
			this.addForm = { user_id: '', date: d, type: 'overtime', hours: '', multiplier: '1.5', rate: '', note: '' };
			this.showAdd = true;
		},
		handleAdd() {
			const f = this.addForm;
			if (!f.user_id || !f.date || !f.hours) {
				uni.showToast({ title: '用户ID、日期、时长必填', icon: 'none' });
				return;
			}
			// 时薪默认 15.29（2660/174），加班 1.5x 平日 2.0x 周末/法定
			const rate = parseFloat(f.rate) || 15.29;
			const multiplier = parseFloat(f.multiplier) || 1.5;
			const hours = parseFloat(f.hours);
			const salary = Math.round(hours * rate * multiplier * 100) / 100;
			adminApi.addOvertime({
				user_id: parseInt(f.user_id),
				date: f.date,
				hours,
				rate,
				multiplier,
				salary,
				note: f.note || '',
				type: f.type,
			}).then(() => {
				uni.showToast({ title: '保存成功', icon: 'success' });
				this.showAdd = false;
				this.loadData();
			}).catch(() => {});
		},
	},
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a2e; }
.nav-action { font-size: 14px; color: #3071f6; padding: 4px 8px; }

.summary-bar { background: #fff; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.summary-scroll { white-space: nowrap; padding: 0 12px; }
.summary-item {
	display: inline-flex; flex-direction: column; background: #f5f6fa;
	border-radius: 10px; padding: 10px 14px; margin-right: 10px;
}
.summary-month { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.summary-ot { font-size: 12px; color: #ff7d00; margin-top: 4px; }
.summary-comp { font-size: 12px; color: #00a862; margin-top: 2px; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.ot-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; display: flex; align-items: center;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.ot-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ot-title-row { display: flex; align-items: center; gap: 8px; }
.ot-user { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.ot-type { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.t-ot { background: #fff3e8; color: #ff7d00; }
.t-comp { background: #e8f7ef; color: #00a862; }
.ot-date { font-size: 12px; color: #bbb; margin-top: 6px; }
.ot-note { font-size: 12px; color: #666; margin-top: 4px; }
.ot-salary { display: flex; flex-direction: column; align-items: flex-end; }
.salary-num { font-size: 16px; font-weight: 700; color: #e64340; }
.salary-label { font-size: 11px; color: #bbb; margin-top: 2px; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }

.mask {
	position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999;
	display: flex; align-items: flex-end;
}
.sheet {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 16px 30px;
	box-sizing: border-box; max-height: 80vh; overflow-y: auto;
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.sheet-close { font-size: 16px; color: #999; padding: 4px; }
.form-group { margin-bottom: 14px; }
.form-label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.form-input {
	height: 42px; background: #f5f6fa; border-radius: 10px; padding: 0 14px; font-size: 14px;
}
.picker-box {
	height: 42px; background: #f5f6fa; border-radius: 10px; padding: 0 14px;
	font-size: 14px; line-height: 42px; color: #333;
}
.type-select { display: flex; gap: 10px; }
.type-option {
	flex: 1; text-align: center; padding: 10px 0; border-radius: 10px;
	background: #f5f6fa; color: #666; font-size: 14px;
}
.type-option.active { background: #3071f6; color: #fff; }
.btn-primary {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; margin-top: 20px;
}
</style>
