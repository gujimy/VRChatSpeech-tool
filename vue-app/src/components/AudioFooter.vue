<template>
  <v-footer app class="d-flex flex-column pa-3" height="auto" permanent fixed>
    <v-form class="d-flex w-100 align-center" @submit.prevent="$emit('submit')">
      <!-- 输入框和波形可视化的组合容器 -->
      <div class="input-with-waveform me-3">
        <v-textarea
          :model-value="inputText"
          @update:model-value="$emit('update:inputText', $event)"
          variant="outlined"
          label="输入文本或点击麦克风说话"
          rows="1"
          hide-details
          flat
          auto-grow
          max-rows="3"
          @keydown.enter.exact.prevent="$emit('submit')"
        >
        </v-textarea>
        
        <!-- 波形可视化条 - 在输入框内部底部 -->
        <div class="footer-waveform-container-inline">
          <div
            v-for="(level, index) in waveformHistory"
            :key="index"
            class="footer-waveform-bar"
            :style="{ height: Math.max(2, level * 0.4) + 'px' }"
            :class="{ 'active': isRecognizing }"
          ></div>
        </div>
      </div>

      <!-- 麦克风按钮 -->
      <v-btn
        :color="isRecognizing ? 'success' : 'error'"
        :variant="isRecognizing ? 'flat' : 'outlined'"
        icon
        size="small"
        @click="$emit('toggle-recognition')"
      >
        <v-icon size="small">{{ isRecognizing ? 'mdi-microphone' : 'mdi-microphone-off' }}</v-icon>
      </v-btn>
    </v-form>
  </v-footer>
</template>

<script setup>
defineProps({
  inputText: String,
  isRecognizing: Boolean,
  waveformHistory: Array
})

defineEmits([
  'update:inputText',
  'submit',
  'toggle-recognition'
])
</script>

<style scoped>
/* 输入框和波形可视化组合容器 */
.input-with-waveform {
  position: relative;
  flex: 1;
}

/* 波形可视化条 - 内嵌在输入框底部 */
.footer-waveform-container-inline {
  position: absolute;
  bottom: 10px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 24px;
  gap: 2px;
  pointer-events: none;
  z-index: 1;
}

.footer-waveform-container-inline .footer-waveform-bar {
  width: 3px;
  background: rgba(124, 77, 255, 0.4);
  border-radius: 2px;
  min-height: 2px;
  transition: height 0.05s ease-out, background 0.3s ease;
}

.footer-waveform-container-inline .footer-waveform-bar.active {
  background: linear-gradient(to top, #7c4dff, #ea80fc);
  box-shadow: 0 0 4px rgba(124, 77, 255, 0.6);
}
</style>