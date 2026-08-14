<template>
	<view class="card">
		<view class="card-title-row" @click="$emit('toggle')">
			<text class="card-title">薪资设置</text>
			<text class="card-toggle">{{ open ? '收起' : '展开' }}</text>
		</view>
		<view v-if="open">
			<view class="form-row">
				<text class="form-label">底薪</text>
				<input class="form-input right" :value="form.base_salary" type="digit" placeholder="0" @input="e => update('base_salary', e.detail.value)" />
			</view>
			<view class="form-row">
				<text class="form-label">奖金</text>
				<input class="form-input right" :value="form.bonus" type="digit" placeholder="0" @input="e => update('bonus', e.detail.value)" />
			</view>
			<view class="form-row">
				<text class="form-label">岗位津贴</text>
				<input class="form-input right" :value="form.position_salary" type="digit" placeholder="0" @input="e => update('position_salary', e.detail.value)" />
			</view>
			<view class="form-row">
				<text class="form-label">绩效分</text>
				<input class="form-input right" :value="form.performance_score" type="digit" placeholder="0" @input="e => update('performance_score', e.detail.value)" />
			</view>
			<view class="form-row">
				<text class="form-label">绩效系数</text>
				<input class="form-input right" :value="form.performance_rate" type="digit" placeholder="1.0" @input="e => update('performance_rate', e.detail.value)" />
			</view>
			<view class="form-row noborder">
				<text class="form-label">加班时薪</text>
				<text class="auto-rate-text">¥{{ autoOvertimeRate }}/h（底薪÷174h）</text>
			</view>
			<view class="form-row noborder">
				<text class="form-label">五险一金</text>
				<switch :checked="form.social_insurance" @change="e => update('social_insurance', e.detail.value)" color="#3071f6"/>
			</view>
			<view v-if="form.social_insurance">
				<view class="form-row si-row">
					<text class="form-label si-label">养老(%)</text>
					<input class="form-input right" :value="form.si_pension" type="digit" placeholder="8" @input="e => update('si_pension', e.detail.value)" />
				</view>
				<view class="form-row si-row">
					<text class="form-label si-label">医疗(%)</text>
					<input class="form-input right" :value="form.si_medical" type="digit" placeholder="2" @input="e => update('si_medical', e.detail.value)" />
				</view>
				<view class="form-row si-row">
					<text class="form-label si-label">失业(%)</text>
					<input class="form-input right" :value="form.si_unemployment" type="digit" placeholder="0.5" @input="e => update('si_unemployment', e.detail.value)" />
				</view>
				<view class="form-row si-row noborder">
					<text class="form-label si-label">公积金(%)</text>
					<input class="form-input right" :value="form.si_housing" type="digit" placeholder="8" @input="e => update('si_housing', e.detail.value)" />
				</view>
			</view>
			<button class="submit-btn" @click="$emit('save')">保存设置</button>
		</view>
	</view>
</template>

<script>
export default {
	name: 'SalarySettingsCard',
	props: {
		form: { type: Object, default: () => ({}) },
		open: { type: Boolean, default: false },
		autoOvertimeRate: { type: String, default: '--' }
	},
	methods: {
		update(key, val) {
			this.$emit('update:field', key, val);
		}
	}
};
</script>

<style scoped>
.card { width:100%; box-sizing:border-box; background:#fff; border-radius:20upx; padding:0 24upx; margin-bottom:20upx; box-shadow:0 2upx 12upx rgba(0,0,0,0.04); }
.card-title-row { display:flex; justify-content:space-between; align-items:center; padding:24upx 0; }
.card-title { display:block; font-size:28upx; font-weight:600; color:#303132; }
.card-toggle { font-size:24upx; color:#909398; }
.form-row { display:flex; align-items:center; justify-content:space-between; padding:20upx 0; border-bottom:1px solid #f3f4f6; }
.form-row.noborder { border-bottom:none; }
.form-label { font-size:26upx; color:#303132; }
.form-input { flex:1; text-align:left; margin-left:24upx; font-size:26upx; }
.form-input.right { text-align:right; }
.si-row { padding:10upx 0; }
.si-label { width:160upx; }
.auto-rate-text { font-size:22upx; color:#3071f6; font-weight:600; }
.submit-btn { margin-top:20upx; height:80upx; line-height:80upx; background:#3071f6; color:#fff; font-size:28upx; font-weight:600; border-radius:14upx; border:none; }
</style>
