<template>
	<view class="stats-card">
		<view class="stats-row three">
			<view class="stat-item">
				<text class="stat-value">{{ stats.totalDays }}</text>
				<text class="stat-label">加班天数</text>
			</view>
			<view class="stat-item">
				<text class="stat-value">{{ stats.totalHours }}</text>
				<text class="stat-label">加班工时</text>
			</view>
			<view class="stat-item">
				<text class="stat-value highlight">{{ stats.totalOvertimeSalary }}</text>
				<text class="stat-label">加班费</text>
			</view>
		</view>
		<view class="stats-divider"></view>
		<view class="stats-row two" v-if="salary">
			<view class="stat-item">
				<text class="stat-sub-label">底薪</text>
				<text class="stat-sub-value">¥{{ salary.base_salary }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-sub-label">奖金</text>
				<text class="stat-sub-value">¥{{ salary.bonus }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-sub-label">岗位津贴</text>
				<text class="stat-sub-value">¥{{ salary.position_salary || 0 }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-sub-label">绩效</text>
				<text class="stat-sub-value">¥{{ salary.performance_pay }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-sub-label total-label">总薪资</text>
				<text class="stat-sub-value total-value">¥{{ salary.total_pay }}</text>
			</view>
		</view>
		<view class="stats-divider" v-if="salary && salary.overtime_rate_auto"></view>
		<text class="auto-rate-hint" v-if="salary && salary.overtime_rate_auto">加班时薪 ¥{{ salary.overtime_rate_auto }}/h（底薪÷174h）</text>
		<view class="stats-row comp-row" v-if="stats.compHours && parseFloat(stats.compHours) > 0">
			<text class="stat-sub-label comp-label">调休</text>
			<text class="stat-sub-value comp">{{ stats.compHours }}h</text>
		</view>
		<view class="deduction-detail" v-if="salary && salary.social_insurance">
			<text class="dd-title">五险一金明细</text>
			<view class="dd-row"><text class="dd-label">养老 {{ salary.si_config.pension || 8 }}%</text><text class="dd-val">-¥{{ salary.pension_deduction || 0 }}</text></view>
			<view class="dd-row"><text class="dd-label">医疗 {{ salary.si_config.medical || 2 }}%</text><text class="dd-val">-¥{{ salary.medical_deduction || 0 }}</text></view>
			<view class="dd-row"><text class="dd-label">失业 {{ salary.si_config.unemployment || 0.5 }}%</text><text class="dd-val">-¥{{ salary.unemployment_deduction || 0 }}</text></view>
			<view class="dd-row"><text class="dd-label">公积金 {{ salary.si_config.housing || 8 }}%</text><text class="dd-val">-¥{{ salary.housing_deduction || 0 }}</text></view>
			<view class="dd-row dd-tax"><text class="dd-label">个税(起征5000)</text><text class="dd-val">-¥{{ salary.tax || 0 }}</text></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'SalarySummaryCard',
	props: {
		stats: { type: Object, default: () => ({ totalDays: 0, totalHours: '0.0', totalOvertimeSalary: '0' }) },
		salary: { type: Object, default: null }
	}
};
</script>

<style scoped>
.stats-card { width:100%; box-sizing:border-box; background:linear-gradient(135deg,#1b44a6,#3071f6); border-radius:20upx; padding:28upx 24upx; margin-bottom:20upx; box-shadow:0 8upx 32upx rgba(48,113,246,0.25); }
.stats-row { display:flex; }
.stats-row.three .stat-item { flex:1; text-align:center; }
.stats-row.two .stat-item { flex:1; text-align:center; padding:8upx 0; }
.stat-value { display:block; font-size:48upx; font-weight:700; color:#fff; }
.stat-value.highlight { color:#ffd700; }
.stat-label { display:block; font-size:22upx; color:rgba(255,255,255,0.7); margin-top:4upx; }
.stats-divider { height:1px; background:rgba(255,255,255,0.15); margin:16upx 0 12upx; }
.stat-sub-label { display:block; font-size:20upx; color:rgba(255,255,255,0.65); }
.stat-sub-value { display:block; font-size:24upx; color:#fff; margin-top:4upx; }
.stat-sub-label.total-label { font-weight:600; }
.stat-sub-value.total-value { font-weight:700; font-size:28upx; color:#ffd700; }
.comp-row { justify-content:center; align-items:center; gap:12upx; padding-top:12upx; }
.comp-label { font-size:22upx; color:rgba(255,255,255,0.7); }
.comp { font-weight:700; color:#a8e6ff; font-size:26upx; }
.auto-rate-hint { display:block; text-align:center; font-size:22upx; color:#ffd700; margin-top:12upx; }
.deduction-detail { margin-top:16upx; padding-top:16upx; border-top:1px dashed rgba(255,255,255,0.25); }
.dd-title { display:block; font-size:22upx; color:rgba(255,255,255,0.85); font-weight:600; margin-bottom:10upx; }
.dd-row { display:flex; justify-content:space-between; padding:6upx 0; font-size:22upx; color:rgba(255,255,255,0.85); }
.dd-tax .dd-label, .dd-tax .dd-val { color:#ffd700; }
</style>
