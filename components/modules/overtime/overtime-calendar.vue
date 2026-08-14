<template>
	<view class="calendar-body">
		<view class="cal-weekdays">
			<text v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="cal-weekday">{{ w }}</text>
		</view>
		<view class="cal-days">
			<view
				v-for="d in days" :key="d.key"
				class="cal-day-wrap"
				@click="$emit('day-click', d)"
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
					<text class="cal-day-num">{{ d.day || '' }}</text>
					<text v-if="d.hasOvertime" class="cal-hours-text">{{ d.otHoursText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'OvertimeCalendar',
	props: {
		days: { type: Array, default: () => [] }
	}
};
</script>

<style scoped>
.calendar-body { margin-top:8upx; }
.cal-weekdays { display:flex; }
.cal-weekday { flex:1; text-align:center; font-size:20upx; color:#909398; padding:8upx 0; }
.cal-days { display:flex; flex-wrap:wrap; }
.cal-day-wrap { width:14.2857%; padding:4upx; box-sizing:border-box; }
.cal-day { height:72upx; border-radius:10upx; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fb; }
.cal-day-num { font-size:22upx; color:#303132; }
.cal-hours-text { font-size:16upx; color:#fff; font-weight:600; margin-top:2upx; }
.cal-muted .cal-day-num { color:#c0c4cc; }
.cal-weekend .cal-day-num { color:#e6a23c; }
.cal-holiday .cal-day-num { color:#e64340; }
.cal-has-ot { background:#3071f6; }
.cal-has-ot .cal-day-num { color:#fff; }
.cal-level-1 { background:#93c5fd; }
.cal-level-2 { background:#60a5fa; }
.cal-level-3 { background:#3b82f6; }
.cal-level-4 { background:#1d4ed8; }
.cal-selected { outline:2upx solid #1b44a6; outline-offset:-2upx; }
</style>
