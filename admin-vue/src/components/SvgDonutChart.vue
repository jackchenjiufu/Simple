<template>
  <div style="display:flex;align-items:center;gap:16px">
    <svg viewBox="0 0 120 120" style="width:120px;height:120px;flex:none">
      <circle cx="60" cy="60" r="48" fill="none" stroke="#f0f0f0" stroke-width="22"/>
      <circle v-for="(s, i) in arcs" :key="i" cx="60" cy="60" r="48" fill="none"
              :stroke="s.color" stroke-width="22"
              :stroke-dasharray="`${s.len} ${C - s.len}`"
              :stroke-dashoffset="-s.offset" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="#333">{{ total }}</text>
      <text x="60" y="72" text-anchor="middle" font-size="9" fill="#999">行为数</text>
    </svg>
    <div style="font-size:12px;color:#666;line-height:2">
      <div v-for="(s, i) in items" :key="i">
        <span :style="{ display:'inline-block', width:'10px', height:'10px', background:s.color, borderRadius:'2px', marginRight:'6px' }"></span>
        {{ s.label }} <b style="margin-left:4px">{{ s.value }}</b>
        <span style="color:#999;margin-left:4px">{{ pct(s.value) }}</span>
      </div>
      <div v-if="!items.length" style="color:#ccc">暂无数据</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  items: { type: Array, default: () => [] } // [{label, value, color}]
})
const C = 2 * Math.PI * 48
const total = computed(() => props.items.reduce((s, x) => s + (x.value || 0), 0))
const arcs = computed(() => {
  let off = 0
  return props.items.map(it => {
    const len = total.value ? (it.value / total.value) * C : 0
    const a = { len, offset: off, color: it.color }
    off += len
    return a
  })
})
const pct = (v) => total.value ? ((v / total.value) * 100).toFixed(1) + '%' : '0%'
</script>
