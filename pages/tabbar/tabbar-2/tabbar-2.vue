<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-left" @click="navChangeMonth(-1)">
				<text class="nav-arrow">‹</text>
			</view>
			<text class="nav-title">{{ viewYear }}年{{ String(viewMonth).padStart(2,'0') }}月</text>
			<view class="nav-right" @click="navChangeMonth(1)">
				<text class="nav-arrow">›</text>
			</view>
		</view>

		<view v-if="!isLoggedIn" class="login-required">
			<text class="login-icon">⏰</text>
			<text class="login-title">需要登录</text>
			<text class="login-sub">登录后即可管理工资</text>
			<button class="login-btn" @click="goLogin">立即登录</button>
		</view>

		<scroll-view v-else class="body" scroll-y="true">
			<!-- 月度汇总 -->
			<salary-summary-card :stats="stats" :salary="salary" />

			<!-- 工时管理（折叠→日历+表单） -->
			<view class="card calendar-card">
				<view class="card-title-row" @click="showOvertimeCard = !showOvertimeCard">
					<text class="card-title">工时管理</text>
					<text class="card-toggle">{{ showOvertimeCard ? '收起' : '展开' }}</text>
				</view>
				<view v-if="showOvertimeCard" class="overtime-card-body">
					<!-- 日历热力图 -->
					<overtime-calendar :days="calendarDays" @day-click="handleDayClick" />
					<!-- 分隔线 -->
					<view class="cal-form-divider"></view>
					<!-- 内联表单 -->
					<view class="form-row" @click="showDatePicker = true">
						<text class="form-label">日期</text>
						<view class="date-selector">
							<text class="date-value">{{ formDate }}</text>
							<text class="rate-tag" :class="formRateType">{{ formRateLabel }}</text>
						</view>
					</view>
					<view class="form-row">
						<text class="form-label">类型</text>
						<view class="type-toggle">
							<text
								class="type-option"
								:class="{ active: formType === 'overtime' }"
								@click="formType = 'overtime'"
							>加班费</text>
							<text
								class="type-option"
								:class="{ active: formType === 'comp' }"
								@click="formType = 'comp'"
							>调休</text>
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
						<button class="submit-btn" @click="submitOvertime">{{ editingRecord ? '更新' : '提交' }}</button>
						<button v-if="editingRecord" class="cancel-btn" @click="cancelEdit">取消编辑</button>
					</view>
			</view>

			<!-- 薪资设置（折叠） -->
			<salary-settings-card
				:form="salaryForm"
				:open="showSalarySettings"
				:auto-overtime-rate="autoOvertimeRate"
				@toggle="showSalarySettings = !showSalarySettings"
				@update:field="onSalaryField"
				@save="saveSalary"
			/>

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
			<month-records-card
				:records="records"
				:open="showRecords"
				@toggle="showRecords = !showRecords"
				@edit="startEdit"
				@delete="confirmDelete"
			/>
			</scroll-view>

		<!-- 自定义日期选择弹窗 -->
		<view class="modal-overlay" v-if="showDatePicker" @click="showDatePicker = false">
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

	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
import SalarySummaryCard from '../../../components/modules/overtime/salary-summary-card.vue';
import OvertimeCalendar from '../../../components/modules/overtime/overtime-calendar.vue';
import SalarySettingsCard from '../../../components/modules/overtime/salary-settings-card.vue';
import MonthRecordsCard from '../../../components/modules/overtime/month-records-card.vue';
const STD_HOURS = 174;

// 本地日期字符串（YYYY-MM-DD），避免 toISOString 的 UTC 时区偏差
function localDateString() {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

export default {
	components: { SalarySummaryCard, OvertimeCalendar, SalarySettingsCard, MonthRecordsCard },
	data() {
		const now = new Date();
		return {
			statusBarHeight: 0, isLoggedIn: false, userInfo: null,
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			formDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
			formHours: '1.0', formNote: '', formType: 'overtime',
			records: [], salary: null,
			stats: { totalDays: 0, totalHours: '0.0', totalOvertimeSalary: '0' },
			salaryForm: { base_salary: '0', bonus: '0', position_salary: '0', performance_score: '0', performance_rate: '1.0', social_insurance: false, si_pension: '8', si_medical: '2', si_unemployment: '0.5', si_housing: '8' },
			rateConfig: { normal: 1.5, weekend: 2.0, holiday: 3.0 },

			showDatePicker: false, dpYear: now.getFullYear(), dpMonth: now.getMonth() + 1,
			showSalarySettings: false,
			showOvertimeCard: true,
			showRates: false,
			showRecords: true,
			holidayMap: [],
			workdayMap: [],

			deletingId: null,

			editingRecord: null,
			editId: null
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
			const todayStr = localDateString();
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
					isHoliday: this.isHoliday(dateStr),
					isWorkday: this.isWorkday(dateStr),
					date: dateStr
				});
			}
			return days;
		},
		calendarDays() {
			const days = [];
			const first = new Date(this.viewYear, this.viewMonth - 1, 1);
			const last = new Date(this.viewYear, this.viewMonth, 0);
			// 周一为一周开始，计算偏移
			const startPad = first.getDay() === 0 ? 6 : first.getDay() - 1;
			const monthStr = `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}`;
			// 构建 records 的快速查找 map
			const otMap = {};
			if (this.records) {
				for (const r of this.records) {
					const d = r.date.substr(0, 10);
					otMap[d] = (otMap[d] || 0) + parseFloat(r.hours || 0);
				}
			}
			const todayStr = localDateString();
			// 上月补齐
			for (let p = 0; p < startPad; p++) {
				days.push({ key: 'p' + p, day: 0, inMonth: false, hasOvertime: false, otLevel: 0 });
			}
			for (let i = 1; i <= last.getDate(); i++) {
				const dateStr = `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
				const dow = new Date(dateStr).getDay();
				const otHours = otMap[dateStr] || 0;
				const otLevel = otHours > 0 ? Math.ceil(otHours) : 0;
				const otHoursText = otHours > 0 ? (otHours % 1 === 0 ? otHours.toFixed(0) : otHours.toFixed(1)) + 'h' : '';
				days.push({
					key: 'd' + i,
					day: i,
					date: dateStr,
					inMonth: true,
					hasOvertime: otHours > 0,
					otLevel,
					otHoursText,
					isSelected: dateStr === this.formDate,
					isWeekend: dow === 0 || dow === 6,
					isHoliday: this.holidayMap.indexOf(dateStr) >= 0,
					isToday: dateStr === todayStr
				});
			}
			return days;
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		// 登录态与数据加载统一由 onShow 处理，避免首次进入重复请求
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
		navChangeMonth(d) {
			this.viewMonth += d;
			if (this.viewMonth > 12) { this.viewMonth = 1; this.viewYear++; }
			if (this.viewMonth < 1) { this.viewMonth = 12; this.viewYear--; }
			// 日期选择弹窗跟随当前查看的月份
			this.dpYear = this.viewYear;
			this.dpMonth = this.viewMonth;
			this.loadData();
		},
		selectDate(d) {
			if (d.date) { this.formDate = d.date; this.showDatePicker = false; }
		},
		handleDayClick(d) {
			if (!d.inMonth) return;
			this.formDate = d.date;
			if (d.hasOvertime) {
				// 有加班记录 → 进入编辑
				const record = this.records.find(r => r.date.substr(0,10) === d.date);
				if (record) this.startEdit(record);
			} else {
				// 无记录 → 重置为添加模式
				this.editingRecord = null;
				this.editId = null;
				this.formHours = '1.0';
				this.formNote = '';
				this.formType = 'overtime';
			}
		},
		startEdit(r) {
			this.editingRecord = r;
			this.editId = r.id;
			this.formDate = r.date;
			this.formHours = String(r.hours);
			this.formNote = r.note || '';
			this.formType = r.type || 'overtime';
			this.showOvertimeCard = true;
		},
		cancelEdit() {
			this.editingRecord = null;
			this.editId = null;
			const now = new Date();
			this.formDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
			this.formHours = '1.0';
			this.formNote = '';
			this.formType = 'overtime';
		},
		onSalaryField(key, val) {
			this.salaryForm[key] = val;
		},
		confirmDelete(r) {
			this.deletingId = r.id;
			uni.showModal({
				title: '删除记录',
				content: '确定要删除这条记录吗？删除后不可恢复。',
				confirmColor: '#e64340',
				success: (res) => {
					if (res.confirm) {
						this.doDelete();
					}
				},
			});
		},
		async loadData() {
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php',
					data: { user_id: this.userInfo.id, month: `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}` }
				});
				if (res.data.code === 200) {
					const d = res.data.data;
					this.records = d.records || [];
					this.stats = { totalDays: d.total_days||0, totalHours: d.total_hours||'0.0', totalOvertimeSalary: d.total_overtime_salary||'0', compHours: d.compHours||'0.0', compBalance: d.compBalance||'0.0' };
					if (d.salary_config) {
						const base = d.salary_config.base_salary || 0;
						this.salary = { ...d.salary_config, overtime_rate_auto: base > 0 ? (base/STD_HOURS).toFixed(1) : null,
							si_config: (d.salary_config && d.salary_config.si_config) || {} };
						// 回填薪资设置表单
						this.salaryForm = {
							base_salary: String(d.salary_config.base_salary || 0),
							bonus: String(d.salary_config.bonus || 0),
							position_salary: String(d.salary_config.position_salary || 0),
							performance_score: String(d.salary_config.performance_score || 0),
							performance_rate: String(d.salary_config.performance_rate || 1.0),
							social_insurance: !!d.salary_config.social_insurance,
							si_pension: String(d.salary_config.si_pension || 8),
							si_medical: String(d.salary_config.si_medical || 2),
							si_unemployment: String(d.salary_config.si_unemployment || 0.5),
							si_housing: String(d.salary_config.si_housing || 8),
						};
					} else {
						this.salary = null;
						this.salaryForm = { base_salary: '0', bonus: '0', position_salary: '0', performance_score: '0', performance_rate: '1.0',
							social_insurance: false, si_pension: '8', si_medical: '2', si_unemployment: '0.5', si_housing: '8' };
					}
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

			if (this.editingRecord) {
				// 更新模式
				uni.showLoading({ title:'更新中...' });
				try {
					const res = await uni.request({
						url: apiConfig.baseUrl + 'overtime.php', method:'PUT',
						data: { action: 'update_overtime', id: this.editId, user_id: this.userInfo.id,
							date: this.formDate, hours: h, rate, multiplier: mult, note: this.formNote, type: this.formType },
						header: {'Content-Type':'application/json'}
					});
					uni.hideLoading();
					if (res.data.code === 200) {
						uni.showToast({ title:'更新成功', icon:'success' });
						this.cancelEdit();
						this.loadData();
					} else { uni.showToast({ title: res.data.message||'更新失败', icon:'none' }); }
				} catch(e) { uni.hideLoading(); uni.showToast({ title:'网络错误', icon:'none' }); }
			} else {
				// 添加模式
				uni.showLoading({ title:'提交中...' });
				try {
					const res = await uni.request({
						url: apiConfig.baseUrl + 'overtime.php', method:'POST',
						data: { user_id: this.userInfo.id, date: this.formDate, hours: h, rate, multiplier: mult, note: this.formNote, type: this.formType },
						header: {'Content-Type':'application/json'}
					});
					uni.hideLoading();
					if (res.data.code === 200) {
						uni.showToast({ title:'添加成功', icon:'success' });
						this.formHours = '1.0'; this.formNote = '';
						this.loadData();
					} else { uni.showToast({ title: res.data.message||'提交失败', icon:'none' }); }
				} catch(e) { uni.hideLoading(); uni.showToast({ title:'网络错误', icon:'none' }); }
			}
		},
		async saveSalary() {
			uni.showLoading({ title:'保存中...' });
			try {
				const rate = parseFloat(this.salaryForm.base_salary) / STD_HOURS;
				const res = await uni.request({
					url: apiConfig.baseUrl + 'overtime.php', method:'PUT',
					data: { action:'save_salary', user_id: this.userInfo.id, month: `${this.viewYear}-${String(this.viewMonth).padStart(2,'0')}`,
						base_salary: parseFloat(this.salaryForm.base_salary)||0,
						bonus: parseFloat(this.salaryForm.bonus)||0,
						position_salary: parseFloat(this.salaryForm.position_salary)||0,
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
					uni.showToast({ title:'已删除', icon:'success' });
					this.loadData();
				}
			} catch(e) { uni.hideLoading(); }
		}
	}
}
</script>

<style>
.content { height: 100vh; overflow: hidden; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; flex-shrink: 0; }
.nav-bar { display:flex; align-items:center; justify-content:space-between; padding:12upx 24upx 16upx; background:#fff; border-bottom:1px solid #f0f0f0; flex-shrink:0; box-shadow:0 2upx 12upx rgba(0,0,0,0.05); z-index:10; }
.nav-left, .nav-right { width:80upx; height:60upx; display:flex; align-items:center; justify-content:center; }
.nav-arrow { font-size:40upx; color:#3071f6; font-weight:600; }
.nav-title { font-size:32upx; font-weight:700; color:#1b44a6; text-align:center; flex:1; }
.login-required { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40upx; }
.login-icon { font-size:80upx; margin-bottom:20upx; }
.login-title { font-size:32upx; font-weight:600; color:#303132; margin-bottom:8upx; }
.login-sub { font-size:26upx; color:#909398; margin-bottom:40upx; }
.login-btn { width:400upx; height:88upx; line-height:88upx; background:#3071f6; color:#fff; font-size:28upx; font-weight:600; border-radius:16upx; border:none; }
.body { flex:1; min-height:0; padding:24upx; box-sizing:border-box; }
.card { width:100%; box-sizing:border-box; background:#fff; border-radius:20upx; padding:0 24upx; margin-bottom:20upx; box-shadow:0 2upx 12upx rgba(0,0,0,0.04); }
.card-title { display:block; font-size:28upx; font-weight:600; color:#303132; }
.card-title-row { display:flex; justify-content:space-between; align-items:center; padding:24upx 0; cursor:pointer; }
.card-toggle { font-size:24upx; color:#909398; }
.form-row { display:flex; align-items:center; padding:20upx 0; border-bottom:1px solid #f5f5f5; cursor:pointer; }
.form-row.noborder { border-bottom:none; }
.form-label { width:140upx; font-size:26upx; color:#303132; flex-shrink:0; }
.form-input { flex:1; height:56upx; font-size:26upx; color:#303132; }
.cancel-btn { width:100%; height:76upx; line-height:76upx; background:#fff; color:#909398; font-size:26upx; border:1px solid #e5e7eb; border-radius:16upx; margin:-8upx 0 24upx; }

/* 合并卡片 */
.calendar-card { overflow:hidden; }
.overtime-card-body { padding:0 0 8upx; }
.cal-form-divider { height:2upx; background:#f0f0f0; margin:16upx 0 8upx; }

/* 类型切换 */
.type-toggle { flex:1; display:flex; border-radius:12upx; overflow:hidden; border:1px solid #e5e7eb; }
.type-option { flex:1; text-align:center; padding:12upx 0; font-size:26upx; color:#909398; background:#fff; font-weight:500; }
.type-option.active { background:#3071f6; color:#fff; }

/* 日期选择器 */
.date-selector { flex:1; display:flex; align-items:center; justify-content:space-between; }
.date-value { font-size:26upx; color:#3071f6; font-weight:500; }
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

/* 自定义日历弹窗 */
.modal-overlay {
	position:fixed; top:0; left:0; right:0; bottom:0;
	background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;
	z-index:9999; padding:40upx;
	animation:lmFadeIn 0.2s ease;
}
@keyframes lmFadeIn { from{opacity:0} to{opacity:1} }
.date-picker-modal {
	background:#fff; border-radius:28upx; padding:32upx 28upx;
	width:86%; max-width:600upx; box-shadow:0 16upx 48upx rgba(0,0,0,0.15);
	animation:lmSlideUp 0.25s ease;
}
@keyframes lmSlideUp { from{transform:translateY(30upx);opacity:0} to{transform:translateY(0);opacity:1} }
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

</style>
