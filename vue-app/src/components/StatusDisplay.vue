<template>
  <div class="status-box">
    <div class="status-item">
      <span class="status-label">状态:</span>
      <span class="status-value" :class="statusClass">{{ status }}</span>
    </div>
    <div class="status-item">
      <span class="status-label">桌面版连接:</span>
      <span class="status-value" :class="wsStatusClass">{{ wsStatus }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  wsStatus: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  }
})

const statusClass = computed(() => {
  if (props.status === '就绪') return 'status-ready'
  if (props.status === '正在识别...') return 'status-listening'
  if (props.status.includes('错误')) return 'status-error'
  return ''
})

const wsStatusClass = computed(() => {
  return props.isConnected ? 'status-ready' : 'status-error'
})
</script>

<style scoped>
/* 状态显示样式已移至全局样式 global.css */
</style>