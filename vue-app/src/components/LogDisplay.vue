<template>
  <v-card
    id="log-list"
    ref="logListRef"
    class="fill-height pa-4 log-list"
    color="surface"
    tile
    flat
  >
    <!-- 顶部工具栏 -->
    <div class="log-toolbar">
      <!-- 状态指示器 -->
      <div class="status-indicators">
        <v-chip
          :color="isRecognizing ? 'success' : 'error'"
          size="small"
          variant="flat"
        >
          <v-icon start size="small">
            {{ isRecognizing ? 'mdi-microphone' : 'mdi-microphone-off' }}
          </v-icon>
          {{ isRecognizing ? '识别中' : '已停止' }}
        </v-chip>
        <v-chip
          size="small"
          variant="outlined"
          class="ml-2"
        >
          {{ results.length }} 条记录
        </v-chip>
        <!-- 翻译 API 状态指示器 -->
        <v-chip
          v-if="enableTranslation && targetLang"
          :color="translationAvailable ? 'info' : 'grey'"
          size="small"
          variant="outlined"
          class="ml-2"
        >
          <v-icon start size="small">mdi-translate</v-icon>
          {{ translationMethod }}
        </v-chip>
      </div>
      
      <!-- 清空按钮 -->
      <v-btn
        v-if="results.length > 0"
        color="error"
        variant="text"
        size="small"
        @click="$emit('clear')"
      >
        <v-icon start size="small">mdi-delete-sweep</v-icon>
        清空
      </v-btn>
    </div>
    
    <!-- 记录列表 -->
    <div class="log-content">
      <!-- 最终文本列表 -->
      <div
        v-for="(result, index) in results"
        :key="index"
        class="final-text-container"
      >
        <span class="timestamp">{{ formatTime(result.timestamp) }}</span>
        <div class="text-content">
          <span class="final-text" :class="{ 'manual-text': result.isManual }">
            {{ result.text }}
          </span>
          <!-- 翻译结果 -->
          <span v-if="result.translatedText" class="translated-text">
            {{ result.translatedText }}
          </span>
        </div>
      </div>
      
      <!-- 临时文本 - 在最底部 -->
      <div v-if="interimText" class="interim-text-container">
        <span class="timestamp">{{ getCurrentTime() }}</span>
        <div class="text-content">
          <span class="interim-text">{{ interimText }}</span>
          <!-- 临时翻译结果 -->
          <span v-if="interimTranslation" class="translated-text interim">
            {{ interimTranslation }}
          </span>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!interimText && results.length === 0" class="empty-state">
      <v-icon size="64" color="grey-lighten-1">mdi-microphone-outline</v-icon>
      <p class="mt-4 text-grey">开始说话，文本将显示在这里</p>
      <p class="text-caption text-grey-darken-1 mt-2">
        点击下方麦克风按钮开始/停止识别
      </p>
    </div>
    
    <!-- 滚动到底部按钮 -->
    <v-btn
      v-if="results.length > 3"
      class="scroll-to-bottom-btn"
      icon
      size="small"
      color="primary"
      @click="$emit('scroll-to-bottom')"
    >
      <v-icon>mdi-chevron-double-down</v-icon>
    </v-btn>
  </v-card>
</template>

<script setup>
defineProps({
  height: Number,
  isRecognizing: Boolean,
  results: Array,
  enableTranslation: Boolean,
  targetLang: String,
  translationAvailable: Boolean,
  translationMethod: String,
  interimText: String,
  interimTranslation: String,
  fontSize: String
})

defineEmits(['clear', 'scroll-to-bottom'])

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

const getCurrentTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}
</script>

<style scoped>
/* 日志显示样式已移至全局样式 global.css */
/* 保留组件特定的动态样式 */
.log-list {
  font-size: v-bind(fontSize);
}
</style>