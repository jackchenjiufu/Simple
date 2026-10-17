<template>
  <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:220px">
    <!-- 网格线 -->
    <line v-for="i in 4" :key="'g'+i" :x1="pad" :y1="pad + i*(H-2*pad)/4" :x2="W-pad" :y2="pad + i*(H-2*pad)/4" stroke="#f0f0f0" stroke-width="1"/>
    <text v-for="i in 4" :key="'l'+i" :x="pad-6" :y="pad + i*(H-2*pad)/4 + 4" font-size="10" fill="#999" text-anchor="end">{{ (maxVal*(4-i)/4).toFixed(0) }}</text>
    <!-- 折线（每个系列） -->
    <polyline v-for="(s, si) in series" :key="'s'+si" :points="linePoints(s.points)" :stroke="s.color" stroke-width="2" fill="none" stroke-linejoin="round"/>
    <!-- 日期标签 -->
    <text v-for="(d, i) in labels" :key="'d'+i" :x="xAt(i)" :y="H-8" font-size="10" fill="#999" text-anchor="middle">{{ d }}</text>
    <text v-if="!labels.length" :x="W/2" :y="H/2" font-size="12" fill="#ccc" text-anchor="middle">暂无数据</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  labels: { type: Array, default: () => [] },   // ['08-15', ...]
  series: { type: Array, default: () => [] }    // [{name, color, points: [n,...]}]
})
const W = 560, H = 220, pad = 34
const maxVal = computed(() => {
  const all = props.series.flatMap(s => s.points)
  return Math.max(1, ...all)
})
const xAt = (i) => props.labels.length > 1 ? pad + i * (W - 2 * pad) / (props.labels.length - 1) : W / 2
const yAt = (v) => H - pad - (v / maxVal.value) * (H - 2 * pad)
const linePoints = (points) => points.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ')
</script>
