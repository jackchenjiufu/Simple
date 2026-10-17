<template>
  <svg :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:180px">
    <line v-for="i in 3" :key="'g'+i" :x1="pad" :y1="pad + i*(H-2*pad)/3" :x2="W-pad" :y2="pad + i*(H-2*pad)/3" stroke="#f0f0f0" stroke-width="1"/>
    <!-- 柱状 -->
    <rect v-for="(v, i) in values" :key="'b'+i"
          :x="xAt(i)" :y="yAt(v)" :width="barW" :height="H - pad - yAt(v)"
          rx="2" :fill="colorAt(i)"/>
    <!-- 数值 -->
    <text v-for="(v, i) in values" :key="'t'+i" :x="xAt(i) + barW/2" :y="yAt(v) - 4"
          font-size="9" fill="#666" text-anchor="middle">{{ v }}</text>
    <!-- 标签 -->
    <text v-for="(l, i) in labels" :key="'l'+i" :x="xAt(i) + barW/2" :y="H-6"
          font-size="9" fill="#999" text-anchor="middle">{{ l }}</text>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  labels: { type: Array, default: () => [] },
  values: { type: Array, default: () => [] },
  color: { type: String, default: '#2f6bf0' },
  colors: { type: Array, default: () => [] } // 可选逐柱颜色
})
const W = 560, H = 180, pad = 30
const maxVal = computed(() => Math.max(1, ...props.values))
const slot = computed(() => (W - 2 * pad) / Math.max(1, props.labels.length))
const barW = computed(() => Math.min(28, slot.value * 0.6))
const xAt = (i) => pad + slot.value * i + (slot.value - barW.value) / 2
const yAt = (v) => H - pad - (v / maxVal.value) * (H - 2 * pad)
const colorAt = (i) => props.colors && props.colors[i] ? props.colors[i] : props.color
</script>
