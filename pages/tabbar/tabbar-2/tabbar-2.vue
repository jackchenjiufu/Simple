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

			<!-- 工时管理（折叠→日历+表单） -->
			<view class="card calendar-card">
				<view class="card-title-row" @click="showOvertimeCard = !showOvertimeCard">
					<text class="card-title">工时管理</text>
					<text class="card-toggle">{{ showOvertimeCard ? '收起' : '展开' }}</text>
				</view>
				<view v-if="showOvertimeCard" class="overtime-card-body">
					<!-- 日历热力图 -->
					<view class="calendar-body">
						<view class="cal-weekdays">
							<text v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="cal-weekday">{{ w }}</text>
						</view>
						<view class="cal-days">
							<view
								v-for="d in calendarDays" :key="d.key"
								class="cal-day-wrap"
								@click="handleDayClick(d)"
							>
								<view
									class="cal-day"
									:class="{
										'cal-muted': !d.inMonth,
										'cal-weekend': d.isWeekend,
										'cal-holiday': d.isHoliday,
										'cal-has-ot': d.hasOvertime,
										'cal-selected': d.isSelected,
										'cal-level-1': d.otLevel === 1,
										'cal-level-2': d.otLevel === 2,
										'cal-level-3': d.otLevel === 3,
										'cal-level-4': d.otLevel >= 4
									}"
								>
									<text class="cal-day-num">{{ d.day }}</text>
									<text v-if="d.hasOvertime" class="cal-hours-text">{{ d.otHoursText }}</text>
								</view>
							</view>
						</view>
					</view>
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
					<text class="form-label">岗位津贴</text>
					<input class="form-input right" v-model="salaryForm.position_salary" type="digit" placeholder="0" />
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
						<text class="record-tag" :class="r.type === 'comp' ? 'tag-comp' : 'tag-overtime'">{{ r.type === 'comp' ? '调休' : '加班' }}</text>
						<text class="record-hours">{{ r.hours }}h</text>
						<text class="record-salary" v-if="r.type !== 'comp'">¥{{ r.salary }}</text>
						<text class="record-edit" @click="startEdit(r)">编辑</text>
						<text class="record-delete" @click="confirmDelete(r)">删除</text>
					</view>
				</view>
					<view class="empty" v-if="records.length === 0"><text>暂无记录</text></view>
				</view>
			</view>
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

		<!-- 删除确认 - 居中弹出 -->
		<view class="action-sheet-overlay" v-if="showDeleteModal" @click="showDeleteModal = false">
			<view class="action-sheet" @click.stop>
				<view class="confirm-icon-wrap danger-icon">
					<text class="confirm-icon-text">!</text>
				</view>
				<text class="action-sheet-title">确认删除</text>
				<text class="action-sheet-hint">确定要删除这条记录吗？</text>
				<view class="confirm-actions">
					<button class="action-sheet-btn cancel" @click="showDeleteModal = false">取消</button>
					<button class="action-sheet-btn danger" @click="doDelete">删除</button>
				</view>
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
			viewYear: now.getFullYear(),
			viewMonth: now.getMonth() + 1,
			formDate: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,
			formHours: '1.0', formNote: '', formType: 'overtime',
			records: [], salary: null,
			stats: { totalDays: 0, totalHours: '0.0', totalOvertimeSalary: '0' },
			salaryForm: { base_salary: '0', bonus: '0', position_salary: '0', performance_score: '0', performance_rate: '1.0' },
			rateConfig: { normal: 1.5, weekend: 2.0, holiday: 3.0 },

			showDatePicker: false, dpYear: now.getFullYear(), dpMonth: now.getMonth() + 1,
			showSalarySettings: false,
			showOvertimeCard: true,
			showRates: false,
			showRecords: true,
			holidayMap: [],
			workdayMap: [],

			showDeleteModal: false, deletingId: null,

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
			const todayStr = new Date().toISOString().substr(0,10);
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
		navChangeMonth(d) {
			this.viewMonth += d;
			if (this.viewMonth > 12) { this.viewMonth = 1; this.viewYear++; }
			if (this.viewMonth < 1) { this.viewMonth = 12; this.viewYear--; }
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
		confirmDelete(r) {
			this.deletingId = r.id;
			this.showDeleteModal = true;
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
				si_config: d.salary_config || {} };
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
.nav-bar { display:flex; align-items:center; justify-content:space-between; padding:12upx 24upx 16upx; background:#fff; border-bottom:1px solid #f0f0f0; }
.nav-left, .nav-right { width:80upx; height:60upx; display:flex; align-items:center; justify-content:center; }
.nav-arrow { font-size:40upx; color:#3071f6; font-weight:600; }
.nav-title { font-size:32upx; font-weight:700; color:#1b44a6; text-align:center; flex:1; }
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
.cancel-btn { width:100%; height:76upx; line-height:76upx; background:#fff; color:#909398; font-size:26upx; border:1px solid #e5e7eb; border-radius:16upx; margin:-8upx 0 24upx; }

/* 日历热力图 */
.calendar-body { padding-bottom:20upx; }
.cal-weekdays { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; margin-bottom:8upx; }
.cal-weekday { font-size:22upx; color:#909398; padding:6upx 0; }
.cal-days { display:grid; grid-template-columns:repeat(7,1fr); gap:4upx; }
.cal-day-wrap { padding:2upx; display:flex; justify-content:center; }
.cal-day { width:100%; aspect-ratio:1; max-width:80upx; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:10upx; position:relative; }
.cal-day-num { font-size:24upx; font-weight:500; color:#303132; line-height:1.2; }
.cal-hours-text { font-size:18upx; color:#3071f6; line-height:1; font-weight:600; margin-top:1upx; }
.cal-muted .cal-day-num { color:#d0d0d0; }
.cal-muted .cal-hours-text { display:none; }
.cal-weekend { background:#f9fafb; }
.cal-weekend .cal-day-num { color:#c0c4cc; }
.cal-holiday .cal-day-num { color:#ef4444; }
.cal-has-ot { border-radius:10upx; }
.cal-level-1 { background:#e6f0fe; }
.cal-level-2 { background:#b3d4fb; }
.cal-level-3 { background:#7eb8f8; }
.cal-level-4 { background:#3071f6; }
.cal-level-1 .cal-day-num { color:#1b44a6; }
.cal-level-2 .cal-day-num { color:#1b44a6; }
.cal-level-3 .cal-day-num { color:#fff; }
.cal-level-4 .cal-day-num { color:#fff; }
.cal-level-1 .cal-hours-text { color:#1b44a6; }
.cal-level-2 .cal-hours-text { color:#1b44a6; }
.cal-level-3 .cal-hours-text { color:#fff; }
.cal-level-4 .cal-hours-text { color:#fff; }
.cal-has-ot.cal-weekend { background:#f0e6e6; }
.cal-has-ot.cal-weekend.cal-level-1 { background:#e6f0fe; }
.cal-has-ot.cal-weekend.cal-level-2 { background:#b3d4fb; }
.cal-has-ot.cal-weekend.cal-level-3 { background:#7eb8f8; }
.cal-has-ot.cal-weekend.cal-level-4 { background:#3071f6; }

/* 合并卡片 */
.calendar-card { overflow:hidden; }
.overtime-card-body { padding:0 0 8upx; }
.cal-form-divider { height:2upx; background:#f0f0f0; margin:16upx 0 8upx; }

/* 选中日期高亮 */
.cal-selected { outline:2upx solid #3071f6; outline-offset:-2upx; }

/* 类型切换 */
.type-toggle { flex:1; display:flex; border-radius:12upx; overflow:hidden; border:1px solid #e5e7eb; }
.type-option { flex:1; text-align:center; padding:12upx 0; font-size:26upx; color:#909398; background:#fff; font-weight:500; }
.type-option.active { background:#3071f6; color:#fff; }
.record-tag { font-size:20upx; padding:2upx 10upx; border-radius:6upx; font-weight:500; }
.record-tag.tag-overtime { background:#eff6ff; color:#3071f6; }
.record-tag.tag-comp { background:#fffbeb; color:#d97706; }
.comp-row { margin-top:8upx; padding-top:8upx; border-top:1px solid rgba(255,255,255,0.15); justify-content:center; align-items:center; gap:8upx; }
.comp-label { font-size:22upx; color:rgba(255,255,255,0.6); }
.comp-dot { font-size:22upx; color:rgba(255,255,255,0.4); }
.comp { color:#ffd700 !important; }

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
.record-right { text-align:right; flex-shrink:0; display:flex; align-items:center; gap:12upx; }
.record-hours { font-size:28upx; font-weight:600; color:#3071f6; }
.record-salary { font-size:22upx; color:#f59e0b; }
.record-edit { font-size:22upx; color:#3071f6; padding:8upx; font-weight:500; }
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

/* 底部弹出菜单 */
.action-sheet-overlay {
	position:fixed; top:0; left:0; right:0; bottom:0;
	background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center;
	z-index:9999; padding:40upx; animation:lmFadeIn 0.2s ease;
}
.action-sheet {
	background:#fff; border-radius:28upx; padding:40upx 36upx 32upx;
	width:86%; max-width:560upx; box-shadow:0 16upx 48upx rgba(0,0,0,0.15);
	animation:lmSlideUp 0.25s ease; text-align:center;
}
.action-sheet-handle { display:none; }
.action-sheet-title { display:block; font-size:30upx; font-weight:700; color:#1f2937; margin-bottom:10upx; }
.action-sheet-hint { display:block; font-size:24upx; color:#ef4444; padding:8upx 12upx; background:#fef2f2; border-radius:10upx; margin:12upx 0 22upx; }
.action-sheet-btn {
	flex:1; height:80upx; line-height:80upx; font-size:28upx; font-weight:500;
	border-radius:14upx; border:none; margin-bottom:0;
}
.action-sheet-btn.danger { flex:1; height:80upx; line-height:80upx; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; font-size:28upx; font-weight:600; border-radius:14upx; border:none; text-align:center; box-shadow:0 4upx 12upx rgba(239,68,68,0.3); }
.action-sheet-btn.cancel { flex:1; height:80upx; line-height:80upx; background:#f3f4f6; color:#374151; font-size:28upx; font-weight:500; border-radius:14upx; border:none; text-align:center; }
.confirm-icon-wrap { width:80upx; height:80upx; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20upx; }
.confirm-icon-wrap.danger-icon { background:linear-gradient(135deg,#fef2f2,#fecaca); box-shadow:0 4upx 16upx rgba(239,68,68,0.25); }
.confirm-icon-text { font-size:36upx; font-weight:700; }
.danger-icon .confirm-icon-text { color:#ef4444; }
.confirm-actions { display:flex; gap:16upx; }
</style>
