<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<text class="nav-title">工资记录</text>
			<text class="nav-subtitle" v-if="isLoggedIn">{{ currentMonth }}</text>
		</view>

		<view v-if="!isLoggedIn" class="login-required">
			<text class="login-icon">⏰</text>
			<text class="login-title">需要登录</text>
			<text class="login-sub">登录后即可管理工资</text>
			<button class="login-btn" @click="goLogin">立即登录</button>
		</view>

		<scroll-view v-else class="body" scroll-y="true">
			<!-- 月度汇总 -->
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
				<view class="deduction-detail" v-if="salary && salary.social_insurance">
					<text class="dd-title">五险一金明细</text>
					<view class="dd-row"><text class="dd-label">养老 {{ salary.si_config.pension || 8 }}%</text><text class="dd-val">-¥{{ salary.pension_deduction || 0 }}</text></view>
					<view class="dd-row"><text class="dd-label">医疗 {{ salary.si_config.medical || 2 }}%</text><text class="dd-val">-¥{{ salary.medical_deduction || 0 }}</text></view>
					<view class="dd-row"><text class="dd-label">失业 {{ salary.si_config.unemployment || 0.5 }}%</text><text class="dd-val">-¥{{ salary.unemployment_deduction || 0 }}</text></view>
					<view class="dd-row"><text class="dd-label">公积金 {{ salary.si_config.housing || 8 }}%</text><text class="dd-val">-¥{{ salary.housing_deduction || 0 }}</text></view>
					<view class="dd-row dd-tax"><text class="dd-label">个税(起征5000)</text><text class="dd-val">-¥{{ salary.tax || 0 }}</text></view>
				</view>
			</view>

			<!-- 薪资设置（折叠） -->
			<view class="card">
				<view class="card-title-row" @click="showSalarySettings = !showSalarySettings">
					<text class="card-title">薪资设置</text>
					<text class="card-toggle">{{ showSalarySettings ? '收起' : '展开' }}</text>
				</view>
				<view v-if="showSalarySettings">
				<view class="form-row">
					<text class="form-label">底薪</text>
					<input class="form-input right" v-model="salaryForm.base_salary" type="digit" placeholder="0" />
				</view>
				<view class="form-row">
					<text class="form-label">奖金</text>
					<input class="form-input right" v-model="salaryForm.bonus" type="digit" placeholder="0" />
				</view>
				<view class="form-row">
					<text class="form-label">绩效分</text>
					<input class="form-input right" v-model="salaryForm.performance_score" type="digit" placeholder="0" />
				</view>
				<view class="form-row">
					<text class="form-label">绩效系数</text>
					<input class="form-input right" v-model="salaryForm.performance_rate" type="digit" placeholder="1.0" />
				</view>
				<view class="form-row noborder">
					<text class="form-label">加班时薪</text>
					<text class="auto-rate-text">¥{{ autoOvertimeRate }}/h（底薪÷174h）</text>
				</view>
				<view class="form-row noborder">
					<text class="form-label">五险一金</text>
					<switch :checked="salaryForm.social_insurance" @change="e => salaryForm.social_insurance = e.detail.value" color="#3071f6"/>
				</view>
				<view v-if="salaryForm.social_insurance">
					<view class="form-row si-row">
						<text class="form-label si-label">养老(%)</text>
						<input class="form-input right" v-model="salaryForm.si_pension" type="digit" placeholder="8" />
					</view>
					<view class="form-row si-row">
						<text class="form-label si-label">医疗(%)</text>
						<input class="form-input right" v-model="salaryForm.si_medical" type="digit" placeholder="2" />
					</view>
					<view class="form-row si-row">
						<text class="form-label si-label">失业(%)</text>
						<input class="form-input right" v-model="salaryForm.si_unemployment" type="digit" placeholder="0.5" />
					</view>
					<view class="form-row si-row noborder">
						<text class="form-label si-label">公积金(%)</text>
						<input class="form-input right" v-model="salaryForm.si_housing" type="digit" placeholder="8" />
					</view>
				</view>
					<button class="submit-btn" @click="saveSalary">保存设置</button>
				</view>
			</view>

			<!-- 添加工时（折叠） -->
			<view class="card">
				<view class="card-title-row" @click="showAddForm = !showAddForm">
					<text class="card-title">添加工时</text>
					<text class="card-toggle">{{ showAddForm ? '收起' : '展开' }}</text>
				</view>
				<view v-if="showAddForm">
				<view class="form-row" @click="showDatePicker = true">
					<text class="form-label">日期</text>
					<view class="date-selector">
						<text class="date-value">{{ formDate }}</text>
						<text class="rate-tag" :class="formRateType">{{ formRateLabel }}</text>
					</view>
				</view>
				<view class="form-row">
					<text class="form-label">时长</text>
					<view class="hour-input-group">
						<button class="hour-btn" @click="adj(-0.5)">−</button>
						<input class="hour-input" v-model="formHours" type="digit" />
						<button class="hour-btn" @click="adj(0.5)">+</button>
					</view>
				</view>
				<view class="form-row noborder">
					<text class="form-label">备注</text>
					<input class="form-input" v-model="formNote" placeholder="可选" />
				</view>
					<button class="submit-btn" @click="submitOvertime">提交</button>
				</view>
			</view>

			<!-- 倍率（折叠） -->
				<!-- 倍率（折叠） -->
				<view class="card">
					<view class="card-title-row" @click="showRates = !showRates">
						<text class="card-title">加班倍率</text>
						<text class="card-toggle">{{ showRates ? '收起' : '展开' }}</text>
					</view>
					<view v-if="showRates">
						<view class="rate-row"><text>平时</text><text class="rate-val">{{ rateConfig.normal }}x</text></view>
						<view class="rate-row"><text>周末</text><text class="rate-val">{{ rateConfig.weekend }}x</text></view>
						<view class="rate-row noborder"><text>节假日</text><text class="rate-val">{{ rateConfig.holiday }}x</text></view>
					</view>
				</view>

			<!-- 本月记录（折叠） -->
			<view class="card">
				<view class="card-title-row" @click="showRecords = !showRecords">
					<text class="card-title">本月记录</text>
					<text class="card-toggle">{{ showRecords ? '收起' : '展开' }}</text>
				</view>
				<view v-if="showRecords">
					<view class="record-item" v-for="(r, i) in records" :key="i">
					<view class="record-left">
						<text class="record-date">{{ r.date.substr(5) }}</text>
						<text class="record-note">{{ r.note || '-' }}</text>
					</view>
					<view class="record-right">
						<text class="record-hours">{{ r.hours }}h</text>
						<text class="record-salary">¥{{ r.salary }}</text>
						<text class="record-delete" @click="confirmDelete(r)">删除</text>
					</view>
				</view>
					<view class="empty" v-if="records.length === 0"><text>暂无记录</text></view>
				</view>
			</view>
			</scroll-view>

		<!-- 自定义日期选择弹窗 -->
		<view class="modal-overlay" v-if="showDatePicker" @click.self="showDatePicker = false">
			<view class="date-picker-modal" @click.stop>
				<view class="date-picker-header">
					<text class="dp-nav" @click="changeMonth(-1)">‹</text>
					<text class="dp-month">{{ dpYear }}年{{ String(dpMonth).padStart(2,'0') }}月</text>
					<text class="dp-nav" @click="changeMonth(1)">›</text>
				</view>
				<view class="dp-weekdays">
					<text v-for="w in ['日','一','二','三','四','五','六']" :key="w" class="dp-weekday">{{ w }}</text>
				</view>
				<view class="dp-days">
					<view v-for="d in dpDays" :key="d.key" class="dp-day-wrap">
						<view
							class="dp-day"
							:class="{ selected: d.isSelected, today: d.isToday, muted: !d.inMonth }"
							@click="selectDate(d)"
						>{{ d.day }}</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 删除确认 - 底部弹出 -->
		<view class="action-sheet-overlay" v-if="showDeleteModal" @click.self="showDeleteModal = false">
			<view class="action-sheet" @click.stop>
				<view class="action-sheet-handle"></view>
				<text class="action-sheet-title">确定要删除这条记录吗？</text>
				<text class="action-sheet-hint">删除后无法恢复</text>
				<button class="action-sheet-btn danger" @click="doDelete">删除</button>
				<button class="action-sheet-btn cancel" @click="showDeleteModal = false">取消</button>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
const STD_HOURS = 174;

export default {
	data() {
		const now = new Date();
		return {
			statusBarHeight: 0, isLoggedIn: false, userInfo: null,
			currentMonth: `${now.getFullYear()}年${now.getMonth()+1}月`,
			formDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
			formHours: '1.0', formNote: '',
			records: [], salary: null,
			stats: { totalDays: 0, totalHours: '0.0', totalOvertimeSalary: '0' },
			salaryForm: { base_salary: '0', bonus: '0', performance_score: '0', performance_rate: '1.0' },
			rateConfig: { normal: 1.5, weekend: 2.0, holiday: 3.0 },

			showDatePicker: false, dpYear: now.getFullYear(), dpMonth: now.getMonth() + 1,
			showSalarySettings: false,
			showAddForm: true,
			showRates: false,
			showRecords: true,
			holidayMap: [],
			workdayMap: [],

			showDeleteModal: false, deletingId: null
		}
	},
	computed: {
		formRateLabel() {
			if (this.isHoliday(this.formDate)) return '节假日 ' + this.rateConfig.holiday + 'x';
			const day = new Date(this.formDate).getDay();
			if (day === 0 || day === 6) return '周末 ' + this.rateConfig.weekend + 'x';
			return '平日 ' + this.rateConfig.normal + 'x';
		},
		formRateType() {
			if (this.isHoliday(this.formDate)) return 'holiday';
			const day = new Date(this.formDate).getDay();
			return day === 0 || day === 6 ? 'weekend' : 'normal';
		},
		autoOvertimeRate() {
			const base = parseFloat(this.salaryForm.base_salary) || 0;
			return base > 0 ? (base / STD_HOURS).toFixed(1) : '--';
		},
		dpDays() {
			const days = [];
			const first = new Date(this.dpYear, this.dpMonth - 1, 1);
			const last = new Date(this.dpYear, this.dpMonth, 0);
			const startPad = first.getDay();
			const todayStr = new Date().toISOString().substr(0,10);
			for (let p = 0; p < startPad; p++) {
				const d = new Date(this.dpYear, this.dpMonth - 1, -startPad + p + 1);
				days.push({ key: 'p' + p, day: d.getDate(), inMonth: false, isToday: false, isSelected: false, date: '' });
			}
			for (let i = 1; i <= last.getDate(); i++) {
				const dateStr = `${this.dpYear}-${String(this.dpMonth).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
				days.push({
					key: i, day: i, inMonth: true,
					isToday: dateStr === todayStr,
					isSelected: dateStr === this.formDate,
					isWeekend: [0,6].includes(new Date(dateStr).getDay()),
					isHoliday: this.isHoliday ? this.isHoliday(dateStr) : false,
					isWorkday: this.isWorkday ? this.isWorkday(dateStr) : false,
					date: dateStr
				});
			}
			return days;
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		const userInfo = uni.getStorageSync('userInfo');
		if (userInfo && uni.getStorageSync('isLoggedIn')) {
			this.isLoggedIn = true; this.userInfo = userInfo;
			this.loadData();
		}
		this.loadHolidays();
	},
	onShow() {
		const ui = uni.getStorageSync('userInfo');
		if (ui && uni.getStorageSync('isLoggedIn')) {
			this.isLoggedIn = true;
			this.userInfo = ui;
			this.loadData();
		} else {
			this.isLoggedIn = false;
			this.userInfo = null;
		}
	},
	methods: {
		async loadHolidays() {
			// 2026年节假日数据
			this.holidayMap = [
				'2026-01-01', // 元旦
				'2026-01-02',
				'2026-01-03',
				'2026-01-28','2026-01-29','2026-01-30','2026-01-31','2026-02-01','2026-02-02','2026-02-03', // 春节
				'2026-02-04','2026-02-05','2026-02-06','2026-02-07','2026-02-08','2026-02-09','2026-02-10','2026-02-11',
				'2026-04-04','2026-04-05','2026-04-06', // 清明节
				'2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05', // 劳动节
				'2026-06-19','2026-06-20','2026-06-21', // 端午节（6月19日）
				'2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07', // 国庆节
			];
			// 2026年调休上班日
			this.workdayMap = [
				'2026-01-04', // 周日补元旦
				'2026-02-14','2026-02-15', // 周末补春节
				'2026-04-12', // 周日补清明
				'2026-04-26', // 周日补劳动节
				'2026-06-23', // 端午调休
				'2026-09-27','2026-10-10', // 补国庆
			];
		},
		isHoliday(dateStr) {
			if (!dateStr) return false;
			const d = dateStr.substr(0, 10);
			return this.holidayMap.indexOf(d) >= 0;
		},
		isWorkday(dateStr) {
			if (!dateStr) return false;
			const d = dateStr.substr(0, 10);
			return this.workdayMap.indexOf(d) >= 0;
		},
		goLogin() { uni.navigateTo({ url: '/pages/auth/login' }); },
		adj(d) { let h = parseFloat(this.formHours)||0; this.formHours = Math.max(0.5, h+d).toFixed(1); },
		changeMonth(d) {
			this.dpMonth += d;
			if (this.dpMonth > 12) { this.dpMonth = 1; this.dpYear++; }
			if (this.dpMonth < 1) { this.dpMonth = 12; this.dpYear--; }
		},
		selectDate(d) {
			if (d.date) { this.formDate = d.date; this.showDatePicker = false; }
		},
		confirmDelete(r) {
			this.deletingId = r.id;
			this.showDeleteModal = true;
		},
		async loadData() {
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php',
					data: { user_id: this.userInfo.id, month: new Date().toISOString().substr(0,7) }
				});
				if (res.data.code === 200) {
					const d = res.data.data;
					this.records = d.records || [];
					this.stats = { totalDays: d.total_days||0, totalHours: d.total_hours||'0.0', totalOvertimeSalary: d.total_overtime_salary||'0' };
					if (d.salary_config) {
						const base = d.salary_config.base_salary || 0;
						this.salary = { ...d.salary_config, overtime_rate_auto: base > 0 ? (base/STD_HOURS).toFixed(1) : null,
				si_config: d.salary_config || {} };
					} else { this.salary = null; }
					if (d.rate_config) this.rateConfig = d.rate_config;
				}
			} catch(e) { console.error(e); }
		},
		async submitOvertime() {
			const h = parseFloat(this.formHours);
			if (!h || h <= 0) { uni.showToast({ title:'请输入有效时长', icon:'none' }); return; }
			const day = new Date(this.formDate).getDay();
			let mult = this.rateConfig.normal;
			if (this.isHoliday(this.formDate)) { mult = this.rateConfig.holiday; }
			else if (day === 0 || day === 6) { mult = this.rateConfig.weekend; }
			const base = parseFloat(this.salaryForm.base_salary) || (this.salary ? this.salary.base_salary : 0);
			const rate = base > 0 ? base / STD_HOURS : 30;
			uni.showLoading({ title:'提交中...' });
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php', method:'POST',
					data: { user_id: this.userInfo.id, date: this.formDate, hours: h, rate, multiplier: mult, note: this.formNote },
					header: {'Content-Type':'application/json'}
				});
				uni.hideLoading();
				if (res.data.code === 200) {
					uni.showToast({ title:'添加成功', icon:'success' });
					this.formHours = '1.0'; this.formNote = '';
					this.loadData();
				} else { uni.showToast({ title: res.data.message||'提交失败', icon:'none' }); }
			} catch(e) { uni.hideLoading(); uni.showToast({ title:'网络错误', icon:'none' }); }
		},
		async saveSalary() {
			uni.showLoading({ title:'保存中...' });
			try {
				const rate = parseFloat(this.salaryForm.base_salary) / STD_HOURS;
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php', method:'PUT',
					data: { action:'save_salary', user_id: this.userInfo.id,
						base_salary: parseFloat(this.salaryForm.base_salary)||0,
						bonus: parseFloat(this.salaryForm.bonus)||0,
						performance_score: parseFloat(this.salaryForm.performance_score)||0,
						performance_rate: parseFloat(this.salaryForm.performance_rate)||1.0,
						overtime_rate: rate, social_insurance: this.salaryForm.social_insurance ? 1 : 0,
					si_pension: parseFloat(this.salaryForm.si_pension)||8,
					si_medical: parseFloat(this.salaryForm.si_medical)||2,
					si_unemployment: parseFloat(this.salaryForm.si_unemployment)||0.5,
					si_housing: parseFloat(this.salaryForm.si_housing)||8 },
					header: {'Content-Type':'application/json'}
				});
				uni.hideLoading();
				if (res.data.code === 200) {
					uni.showToast({ title:'保存成功', icon:'success' });
					this.loadData();
				} else { uni.showToast({ title: res.data.message||'保存失败', icon:'none' }); }
			} catch(e) { uni.hideLoading(); uni.showToast({ title:'网络错误', icon:'none' }); }
		},
		async doDelete() {
			uni.showLoading({ title:'删除中...' });
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php', method:'DELETE',
					data: { id: this.deletingId, user_id: this.userInfo.id },
					header: {'Content-Type':'application/json'}
				});
				uni.hideLoading();
				if (res.data.code === 200) {
					this.showDeleteModal = false;
					uni.showToast({ title:'已删除', icon:'success' });
					this.loadData();
				}
			} catch(e) { uni.hideLoading(); }
		}
	}
}
</script>

<style>
.content { min-height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; }
.nav-bar { display:flex; flex-direction:column; align-items:center; padding:12upx 24upx 16upx; background:#fff; border-bottom:1px solid #f0f0f0; }
.nav-title { font-size:32upx; font-weight:700; color:#1b44a6; }
.nav-subtitle { font-size:22upx; color:#909398; margin-top:4upx; }
.login-required { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40upx; }
.login-icon { font-size:80upx; margin-bottom:20upx; }
.login-title { font-size:32upx; font-weight:600; color:#303132; margin-bottom:8upx; }
.login-sub { font-size:26upx; color:#909398; margin-bottom:40upx; }
.login-btn { width:400upx; height:88upx; line-height:88upx; background:#3071f6; color:#fff; font-size:28upx; font-weight:600; border-radius:16upx; border:none; }
.body { flex:1; padding:24upx; }
.stats-card { background:linear-gradient(135deg,#1b44a6,#3071f6); border-radius:20upx; padding:28upx 24upx; margin-bottom:24upx; box-shadow:0 8upx 32upx rgba(48,113,246,0.25); }
.stats-row { display:flex; }
.stats-row.three .stat-item { flex:1; text-align:center; }
.stats-row.two .stat-item { flex:1; text-align:center; padding:8upx 0; }
.stat-value { display:block; font-size:48upx; font-weight:700; color:#fff; }
.stat-value.highlight { color:#ffd700; }
.stat-label { display:block; font-size:22upx; color:rgba(255,255,255,0.7); margin-top:4upx; }
.stats-divider { height:1px; background:rgba(255,255,255,0.15); margin:16upx 0 12upx; }
.stat-sub-label { display:block; font-size:20upx; color:rgba(255,255,255,0.6); }
.stat-sub-value { display:block; font-size:28upx; color:#fff; font-weight:600; margin-top:2upx; }
.total-label { color:#ffd700; }
.total-value { color:#ffd700; font-size:36upx; }
.auto-rate-hint { font-size:20upx; color:rgba(255,255,255,0.6); margin-top:8upx; }
.card { background:#fff; border-radius:16upx; padding:0 24upx; margin-bottom:20upx; box-shadow:0 2upx 12upx rgba(0,0,0,0.04); }
.card-title { display:block; font-size:28upx; font-weight:600; color:#303132; padding:20upx 0 0; }
.card-title-row { display:flex; justify-content:space-between; align-items:center; padding:24upx 0; cursor:pointer; }
.card-toggle { font-size:24upx; color:#909398; }
.form-row { display:flex; align-items:center; padding:20upx 0; border-bottom:1px solid #f5f5f5; cursor:pointer; }
.form-row.noborder { border-bottom:none; }
.form-label { width:140upx; font-size:26upx; color:#303132; flex-shrink:0; }
.form-input { flex:1; height:56upx; font-size:26upx; color:#303132; }
.form-input.right { text-align:right; }
.si-row { padding:12upx 0; }
.si-label { width:100upx; }
.auto-rate-text { flex:1; text-align:right; font-size:24upx; color:#909398; }

/* 日期选择器 */
.date-selector { flex:1; display:flex; align-items:center; justify-content:space-between; }
.date-value { font-size:26upx; color:#3071f6; font-weight:500; }
.date-arrow { font-size:32upx; color:#c0c4cc; }
.rate-tag { font-size:22upx; padding:4upx 12upx; border-radius:8upx; font-weight:500; }
.rate-tag.normal { background:#eff6ff; color:#3071f6; }
.rate-tag.weekend { background:#fef2f2; color:#ef4444; }
.rate-tag.holiday { background:#fef2f2; color:#ef4444; font-weight:700; }

.hour-input-group { flex:1; display:flex; align-items:center; gap:12upx; }
.hour-btn { width:60upx; height:60upx; line-height:60upx; background:#f3f4f6; border-radius:12upx; border:none; padding:0; text-align:center; font-size:32upx; color:#303132; }
.hour-input { flex:1; height:60upx; text-align:center; font-size:32upx; font-weight:600; border:1px solid #e5e7eb; border-radius:12upx; color:#303132; }
.submit-btn { width:100%; height:80upx; line-height:80upx; background:#3071f6; color:#fff; font-size:28upx; font-weight:600; border-radius:16upx; border:none; margin:16upx 0 24upx; }
.rate-row { display:flex; justify-content:space-between; align-items:center; padding:20upx 0; border-bottom:1px solid #f5f5f5; font-size:26upx; color:#303132; }
.rate-row.noborder { border-bottom:none; }
.rate-val { color:#3071f6; font-weight:600; }
.record-item { display:flex; justify-content:space-between; align-items:center; padding:20upx 0; border-bottom:1px solid #f5f5f5; }
.record-item:last-child { border-bottom:none; }
.record-left { flex:1; }
.record-date { font-size:28upx; font-weight:600; color:#303132; display:block; }
.record-note { font-size:22upx; color:#909398; }
.record-right { text-align:right; flex-shrink:0; display:flex; align-items:center; gap:16upx; }
.record-hours { font-size:28upx; font-weight:600; color:#3071f6; }
.record-salary { font-size:22upx; color:#f59e0b; }
.record-delete { font-size:22upx; color:#ef4444; padding:8upx; }
.deduction-detail { margin-top:8upx; padding:12upx 16upx; background:rgba(255,255,255,0.1); border-radius:12upx; }
.dd-title { display:block; font-size:20upx; color:rgba(255,255,255,0.5); margin-bottom:8upx; }
.dd-row { display:flex; justify-content:space-between; padding:4upx 0; }
.dd-label { font-size:20upx; color:rgba(255,255,255,0.6); }
.dd-val { font-size:20upx; color:rgba(255,255,255,0.7); }
.dd-tax { border-top:1px solid rgba(255,255,255,0.1); padding-top:6upx; margin-top:4upx; }
.empty { padding:40upx 0; text-align:center; font-size:26upx; color:#c0c4cc; }

/* 自定义日历弹窗 */
.modal-overlay {
	position:fixed; top:0; left:0; right:0; bottom:0;
	background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;
	z-index:9999; padding:40upx;
}
.date-picker-modal {
	background:#fff; border-radius:24upx; padding:32upx 28upx;
	width:620upx; max-width:90%; box-shadow:0 16upx 48upx rgba(0,0,0,0.15);
}
.date-picker-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24upx; }
.dp-nav { font-size:40upx; color:#3071f6; font-weight:600; padding:8upx 20upx; cursor:pointer; }
.dp-month { font-size:30upx; font-weight:600; color:#303132; }
.dp-weekdays { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; margin-bottom:16upx; }
.dp-weekday { font-size:22upx; color:#909398; padding:8upx 0; }
.dp-days { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; gap:4upx; }
.dp-day-wrap { padding:4upx; }
.dp-day {
	width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center;
	font-size:26upx; color:#303132; border-radius:50%; cursor:pointer;
}
.dp-day.muted { color:#c0c4cc; }
.dp-day.weekend { color:#ef4444; }
.dp-day.weekend.today { background:#fef2f2; color:#ef4444; }
.dp-day.holiday { color:#ef4444; font-weight:700; }
.dp-day.holiday.today { background:#fef2f2; }
.dp-day.holiday.selected { background:#ef4444; color:#fff; }
.dp-day.weekend.selected { background:#ef4444; color:#fff; }
.dp-day.today { font-weight:700; color:#3071f6; background:#eff6ff; }
.dp-day.selected { color:#fff; background:#3071f6; font-weight:700; }

/* 底部弹出菜单 */
.action-sheet-overlay {
	position:fixed; top:0; left:0; right:0; bottom:0;
	background:rgba(0,0,0,0.4); display:flex; align-items:flex-end;
	z-index:9999;
}
.action-sheet {
	background:#fff; border-radius:24upx 24upx 0 0; padding:16upx 24upx 48upx;
	width:100%; animation:slideUp 0.25s ease;
}
@keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
.action-sheet-handle {
	width:64upx; height:6upx; background:#e5e7eb; border-radius:3upx;
	margin:0 auto 24upx;
}
.action-sheet-title { display:block; text-align:center; font-size:30upx; font-weight:600; color:#303132; margin-bottom:6upx; }
.action-sheet-hint { display:block; text-align:center; font-size:24upx; color:#9ca3af; margin-bottom:28upx; }
.action-sheet-btn {
	width:100%; height:96upx; line-height:96upx; font-size:30upx; font-weight:500;
	border-radius:16upx; border:none; margin-bottom:12upx;
}
.action-sheet-btn.danger { background:#fef2f2; color:#ef4444; font-weight:600; }
.action-sheet-btn.cancel { background:#ffffff; color:#303132; border:1px solid #e5e7eb; }
</style>
