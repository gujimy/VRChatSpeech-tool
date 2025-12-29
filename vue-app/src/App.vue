<template>
  <v-app>
    <!-- 顶部导航栏 -->
    <AppToolbar
      v-model:enableTranslation="settings.enableTranslation"
      v-model:translationService="settings.translationService"
      v-model:recognitionLang="settings.lang"
      v-model:targetLang="settings.targetLang"
      v-model:currentPage="currentPage"
      :translationServiceItems="translationServiceItems"
      :languageOptions="languageOptions"
      :targetLanguageOptions="translation.targetLanguageOptions"
      @update:translationService="handleTranslationServiceChange"
    />

    <!-- 主内容区 -->
    <v-main>
      <!-- 主页 - 文本显示区 -->
      <LogDisplay
        v-show="currentPage === 'home'"
        :isRecognizing="recognition.isRecognizing.value"
        :results="resultsManager.results.value"
        :enableTranslation="settings.enableTranslation"
        :targetLang="settings.targetLang"
        :translationAvailable="translation.isAvailable.value"
        :translationMethod="translation.methodDescription.value"
        :interimText="recognition.interimText.value"
        :interimTranslation="interimTranslation"
        :fontSize="fontSize"
        @clear="handleClearResults"
        @scroll-to-bottom="scrollToBottom"
      />

      <!-- 设置页 -->
      <v-container v-show="currentPage === 'settings'" class="pa-6 settings-page-container">
        <v-card class="pa-6 settings-card" elevation="2">
          <v-card-title class="text-h5 mb-4">设置</v-card-title>
          
          <!-- 音频测试区域 -->
          <v-card-subtitle class="text-h6 mb-2">麦克风设置</v-card-subtitle>
          
          <!-- 麦克风设备选择 -->
          <v-select
            v-model="settings.audioDeviceId"
            :items="audioDevices"
            item-title="label"
            item-value="deviceId"
            label="麦克风设备"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            @update:model-value="handleAudioDeviceChange"
          >
            <template v-slot:prepend-inner>
              <v-icon>mdi-microphone</v-icon>
            </template>
          </v-select>

          <div class="audio-test-section mb-4">
            <div class="d-flex align-center mb-2">
              <span class="text-body-2 text-grey">麦克风测试</span>
              <v-chip
                :color="audioVisualizer.isActive.value ? 'success' : 'grey'"
                size="small"
                class="ml-2"
              >
                {{ audioVisualizer.isActive.value ? '已激活' : '未激活' }}
              </v-chip>
              <v-spacer />
              <span class="text-body-2">
                当前音量: <strong>{{ audioVisualizer.volumeLevel.value.toFixed(1) }}</strong> / 100
              </span>
            </div>
            
            <!-- 实时音量显示（0-100刻度） -->
            <div class="volume-meter mb-2">
              <div class="volume-bar-container">
                <!-- 灵敏度阈值线 -->
                <div
                  v-if="settings.sensitivity > 0"
                  class="sensitivity-threshold-line"
                  :style="{ left: settings.sensitivity + '%' }"
                ></div>
                <div
                  class="volume-bar"
                  :style="{ width: audioVisualizer.volumeLevel.value + '%' }"
                  :class="getVolumeLevelClass(audioVisualizer.volumeLevel.value)"
                ></div>
              </div>
              <span class="volume-label">{{ audioVisualizer.volumeLevel.value.toFixed(0) }}</span>
            </div>
            
            <!-- 灵敏度调节滑块 -->
            <v-slider
              v-model="settings.sensitivity"
              label="灵敏度阈值"
              :min="0"
              :max="100"
              :step="1"
              thumb-label
              color="purple"
              class="mt-2 mb-2"
            >
              <template v-slot:append>
                <span class="text-caption">{{ settings.sensitivity }}</span>
              </template>
            </v-slider>
            
            <!-- 波形可视化 -->
            <div class="waveform-container">
              <div
                v-for="(level, index) in audioVisualizer.waveformHistory.value"
                :key="index"
                class="waveform-bar"
                :style="{ height: Math.max(2, level * 0.6) + 'px' }"
              ></div>
            </div>
            
            <!-- 提示文字 -->
            <div class="text-caption text-grey mt-2">
              <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
              音量需超过 {{ settings.sensitivity }} 才会触发识别
            </div>
          </div>

          <!-- 外观设置 -->
          <v-card-subtitle class="text-h6 mb-2 mt-4">外观</v-card-subtitle>
          <v-slider
            v-model="settings.ui.fontSize"
            label="字体大小"
            :min="16"
            :max="48"
            :step="2"
            suffix="px"
            thumb-label
            class="mb-4"
          />
          
          <v-slider
            v-model="settings.ui.fadeTime"
            label="文本淡出时间"
            :min="0"
            :max="10"
            :step="1"
            suffix="秒"
            thumb-label
            class="mb-4"
          />

          <v-select
            v-model="settings.ui.theme"
            :items="themeOptions"
            label="主题"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- 翻译设置链接 -->
          <v-card-subtitle class="text-h6 mb-2 mt-4">实时翻译</v-card-subtitle>
          
          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-body-2 mb-2">
                  翻译服务 API 配置已移至独立页面
                </div>
              </div>
              <v-btn
                color="primary"
                variant="elevated"
                @click="currentPage = 'translation'"
              >
                <v-icon start>mdi-translate-variant</v-icon>
                打开翻译配置
              </v-btn>
            </div>
          </v-alert>

          <!-- 当前翻译状态 -->
          <div v-if="settings.enableTranslation" class="translation-status-section mb-4">
            <v-chip
              :color="translation.isAvailable.value ? 'success' : 'grey'"
              size="small"
              variant="flat"
            >
              <v-icon start size="small">{{ translation.currentServiceInfo.value?.icon || 'mdi-translate' }}</v-icon>
              当前: {{ translation.methodDescription.value }}
            </v-chip>
            <v-chip
              v-if="translation.isTranslating.value"
              size="small"
              color="info"
              variant="outlined"
              class="ml-2"
            >
              <v-progress-circular size="12" width="2" indeterminate class="mr-1"></v-progress-circular>
              翻译中...
            </v-chip>
          </div>
        </v-card>
      </v-container>

      <!-- 翻译配置页 -->
      <v-container v-show="currentPage === 'translation'" class="pa-6">
        <TranslationSettings v-model:api-keys="settings.apiKeys" />
      </v-container>
    </v-main>

    <!-- 底部输入栏 -->
    <AudioFooter
      v-model:inputText="inputText"
      :isRecognizing="recognition.isRecognizing.value"
      :waveformHistory="audioVisualizer.waveformHistory.value"
      @submit="handleSubmit"
      @toggle-recognition="toggleRecognition"
    />

    <!-- 通知栏 -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top"
      :timeout="3000"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">
          关闭
        </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useTheme } from 'vuetify'
import { useSpeechRecognition } from './composables/useSpeechRecognition'
import { useHostBridge } from './composables/useHostBridge'
import { useRecognitionResults } from './composables/useRecognitionResults'
import { useAudioVisualizer } from './composables/useAudioVisualizer'
import { useTranslation } from './composables/useTranslation'
import { useDebounce } from './composables/useDebounce'
import TranslationSettings from './components/TranslationSettings.vue'
import AppToolbar from './components/AppToolbar.vue'
import LogDisplay from './components/LogDisplay.vue'
import AudioFooter from './components/AudioFooter.vue'

// 获取 Vuetify 主题
const theme = useTheme()

// 初始化组合式函数
const recognition = useSpeechRecognition()
const hostBridge = useHostBridge()
const resultsManager = useRecognitionResults()
const audioVisualizer = useAudioVisualizer()
const translation = useTranslation()

// 临时翻译结果
const interimTranslation = ref('')

// 页面状态
const currentPage = ref('home')
const windowHeight = ref(window.innerHeight)

/**
 * @typedef {Object} AITranslationConfig
 * @property {string} provider - AI 提供商 ('openai' | 'gemini' | 'claude' | 'ollama' | 'lm-studio' | 'custom')
 * @property {string} apiKey - API 密钥
 * @property {string} baseURL - API 基础 URL
 * @property {string} model - 模型名称
 * @property {string} systemPrompt - 系统提示词
 * @property {string} userPrompt - 用户提示词
 * @property {number} temperature - 温度参数
 * @property {number} maxTokens - 最大 token 数
 */

/**
 * @typedef {Object} APIKeysConfig
 * @property {string} deepl - DeepL API Key
 * @property {string} xiaoniu - 小牛翻译 API Key
 * @property {{appKey: string, appSecret: string}} youdao - 有道翻译配置
 * @property {{secretId: string, secretKey: string}} tencent - 腾讯云翻译配置
 * @property {{endpoint: string}} deeplx - DeepLX 服务配置
 * @property {AITranslationConfig} ai - 统一的 AI 翻译配置
 */

/**
 * @typedef {Object} UIConfig
 * @property {number} fontSize - 字体大小（16-48px）
 * @property {number} fadeTime - 文本淡出时间（0-10秒）
 * @property {string} theme - 主题名称
 */

/**
 * @typedef {Object} AppSettings
 * @property {string} lang - 识别语言代码
 * @property {number} sensitivity - 灵敏度阈值（0-100）
 * @property {string} audioDeviceId - 音频设备 ID
 * @property {boolean} enableTranslation - 是否启用翻译
 * @property {string} targetLang - 目标翻译语言
 * @property {string} translationService - 翻译服务名称
 * @property {APIKeysConfig} apiKeys - API 密钥配置
 * @property {UIConfig} ui - UI 配置
 */

/**
 * 应用设置
 * @type {import('vue').Ref<AppSettings>}
 */
const settings = ref({
  lang: 'zh-CN',
  sensitivity: 0,
  audioDeviceId: 'default',
  enableTranslation: false,
  targetLang: '',
  translationService: 'microsoft',
  apiKeys: {
    deepl: '',
    xiaoniu: '',
    youdao: {
      appKey: '',
      appSecret: ''
    },
    tencent: {
      secretId: '',
      secretKey: ''
    },
    deeplx: {
      endpoint: ''
    },
    ai: {
      provider: 'openai',
      apiKey: '',
      baseURL: '',
      model: '',
      systemPrompt: '',
      userPrompt: '',
      temperature: 0.3,
      maxTokens: 1000
    }
  },
  ui: {
    fontSize: 20,
    fadeTime: 0,
    theme: 'midnight_purple'
  }
})

// 翻译服务选项（带可用性标记）
const translationServiceItems = computed(() => {
  return translation.serviceOptions.map(opt => ({
    title: opt.title,
    value: opt.value,
    icon: opt.icon,
    free: opt.free,
    local: opt.local,
    limit: opt.limit,
    apiKey: opt.apiKey,
    experimental: opt.experimental,
    available: translation.availableServices.value.includes(opt.value)
  }))
})

// 处理翻译服务切换
const handleTranslationServiceChange = (service) => {
  if (translation.availableServices.value.includes(service)) {
    settings.value.translationService = service
    translation.setService(service)
    showSnackbar(`已切换到 ${translation.getServiceName(service)}`, 'success')
  } else {
    showSnackbar(`${translation.getServiceName(service)} 不可用`, 'warning')
  }
}

// 音频设备列表
const audioDevices = ref([])

// 输入文本
const inputText = ref('')

// 通知栏
const snackbar = ref({
  show: false,
  text: '',
  color: 'info'
})

// 语言选项
const languageOptions = [
  { title: '中文（简体）', value: 'zh-CN' },
  { title: '中文（繁体）', value: 'zh-TW' },
  { title: 'English', value: 'en-US' },
  { title: '日本語', value: 'ja-JP' },
  { title: '한국어', value: 'ko-KR' }
]

// 主题选项
const themeOptions = [
  { title: '午夜紫', value: 'midnight_purple' },
  { title: '海洋蓝', value: 'ocean_blue' },
  { title: '棉花糖', value: 'cotton_candy' },
  { title: '森林深绿', value: 'forest_dark' },
  { title: '森林浅绿', value: 'forest_light' },
  { title: '暖阳橙', value: 'warm_sunset' }
]

// 计算样式
const fontSize = computed(() => `${settings.value.ui.fontSize}px`)

// 自动滚动到底部（延迟确保DOM已更新）
const scrollToBottom = () => {
  nextTick(() => {
    nextTick(() => {
      const logList = document.getElementById('log-list')
      if (logList) {
        logList.scrollTo({
          top: logList.scrollHeight,
          behavior: 'smooth'
        })
      }
    })
  })
}

// 获取音量级别对应的样式类（0-100范围）
const getVolumeLevelClass = (level) => {
  if (level < 30) return 'volume-low'
  if (level < 70) return 'volume-medium'
  return 'volume-high'
}

// 获取音频设备列表
const getAudioDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    audioDevices.value = devices
      .filter(device => device.kind === 'audioinput')
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}`
      }))
    
    // 如果没有设置设备或设备不存在,使用第一个设备
    if (!settings.value.audioDeviceId || !audioDevices.value.find(d => d.deviceId === settings.value.audioDeviceId)) {
      settings.value.audioDeviceId = audioDevices.value[0]?.deviceId || 'default'
    }
  } catch (error) {
    console.error('获取音频设备失败:', error)
  }
}

// 处理音频设备切换
const handleAudioDeviceChange = async (deviceId) => {
  console.log('切换麦克风设备:', deviceId)
  
  const wasRecognizing = recognition.isRecognizing.value
  
  // 停止当前识别
  if (wasRecognizing) {
    recognition.stop()
  }
  
  // 重新初始化音频可视化
  audioVisualizer.cleanup()
  await audioVisualizer.init(deviceId)
  
  // 重新初始化语音识别的灵敏度检测
  await recognition.initSensitivity(deviceId)
  
  // 如果之前在识别，重新启动
  if (wasRecognizing) {
    setTimeout(() => {
      recognition.start()
    }, 500)
  }
  
  showSnackbar('已切换麦克风设备', 'success')
}

// 初始化应用
onMounted(async () => {
  const savedSettings = localStorage.getItem('speech-settings')
  if (savedSettings) {
    Object.assign(settings.value, JSON.parse(savedSettings))
  }
  
  // 获取音频设备列表
  await getAudioDevices()

  if (settings.value.ui.theme) {
    // 更新为 Vuetify 3.4+ 的现代 API 以解决弃用警告
    theme.name.value = settings.value.ui.theme;
  }

  const initialized = await recognition.init()
  if (!initialized) {
    showSnackbar('语音识别初始化失败', 'error')
    return
  }

  await recognition.initSensitivity(settings.value.audioDeviceId)
  await audioVisualizer.init(settings.value.audioDeviceId)
  await translation.init()
  
  if (settings.value.translationService && translation.availableServices.value.includes(settings.value.translationService)) {
    translation.setService(settings.value.translationService)
  }

  recognition.setupEvents(handleRecognitionResult, handleRecognitionError)

  // WebView2 环境下自动连接
  hostBridge.connect()

  setTimeout(() => {
    if (recognition.status.value === '就绪') {
      recognition.start()
    }
  }, 1000)

  window.addEventListener('resize', () => {
    windowHeight.value = window.innerHeight
  })
})

// 处理识别结果
const handleRecognitionResult = async (text) => {
  if (!text || !text.trim()) return

  const resultIndex = resultsManager.results.value.length
  resultsManager.addResult(text, false)
  scrollToBottom()

  let translatedText = ''
  if (settings.value.enableTranslation && settings.value.targetLang) {
    try {
      translatedText = await translation.translateWithCache(
        text,
        settings.value.lang,
        settings.value.targetLang,
        settings.value.apiKeys
      )
      if (resultsManager.results.value[resultIndex]) {
        resultsManager.results.value[resultIndex].translatedText = translatedText
      }
    } catch (e) {
      console.error('翻译失败:', e)
    }
  }

  if (hostBridge.isConnected.value) {
    hostBridge.send(text, translatedText)
  }

  if (settings.value.ui.fadeTime > 0) {
    setTimeout(() => {
      resultsManager.fadeOutResult(resultsManager.results.value.length - 1)
    }, settings.value.ui.fadeTime * 1000)
  }
}

// 处理识别错误
const handleRecognitionError = (error) => {
  console.error('识别错误:', error)
  showSnackbar(`识别错误: ${error}`, 'error')
}

// 切换识别状态
const toggleRecognition = () => {
  if (recognition.isRecognizing.value) {
    recognition.stop()
  } else {
    recognition.start()
  }
}

// 提交文本
const handleSubmit = async () => {
  if (!inputText.value.trim()) return

  const text = inputText.value
  const resultIndex = resultsManager.results.value.length
  resultsManager.addResult(text, true)
  scrollToBottom()

  let translatedText = ''
  if (settings.value.enableTranslation && settings.value.targetLang) {
    try {
      translatedText = await translation.translateWithCache(
        text,
        settings.value.lang,
        settings.value.targetLang,
        settings.value.apiKeys
      )
      if (resultsManager.results.value[resultIndex]) {
        resultsManager.results.value[resultIndex].translatedText = translatedText
      }
    } catch (e) {
      console.error('翻译失败:', e)
    }
  }

  if (hostBridge.isConnected.value) {
    hostBridge.send(text, translatedText)
  }

  inputText.value = ''

  if (settings.value.ui.fadeTime > 0) {
    setTimeout(() => {
      resultsManager.fadeOutResult(resultsManager.results.value.length - 1)
    }, settings.value.ui.fadeTime * 1000)
  }
}

// 清空所有记录
const handleClearResults = () => {
  resultsManager.clearResults()
  showSnackbar('已清空所有记录', 'success')
}

// 显示通知
const showSnackbar = (text, color = 'info') => {
  snackbar.value.text = text
  snackbar.value.color = color
  snackbar.value.show = true
}

// 监听设置变化
watch(() => settings.value.lang, (newLang) => {
  recognition.changeLang(newLang)
})

watch(() => settings.value.sensitivity, (newValue) => {
  recognition.setSensitivity(newValue)
})

watch(() => settings.value.ui.theme, (newTheme) => {
  // 更新为 Vuetify 3.4+ 的现代 API 以解决弃用警告
  theme.name.value = newTheme;
})

// 创建防抖函数用于临时文本翻译
const { debouncedFn: debouncedTranslateInterim } = useDebounce(async (text) => {
  try {
    interimTranslation.value = await translation.translate(
      text,
      settings.value.lang,
      settings.value.targetLang,
      settings.value.apiKeys
    )
    
    // 翻译完成后，发送到桌面版进行实时OSC更新
    if (hostBridge.isConnected.value) {
      hostBridge.sendInterim(text, interimTranslation.value)
    }
  } catch (e) {
    console.error('临时翻译失败:', e)
    // 即使翻译失败，也发送原文
    if (hostBridge.isConnected.value) {
      hostBridge.sendInterim(text, '')
    }
  }
}, 300)

// 创建防抖函数用于发送临时文本（无翻译）
const { debouncedFn: debouncedSendInterim } = useDebounce((text) => {
  hostBridge.sendInterim(text, '')
}, 100)

// 监听临时文本变化，自动滚动、翻译和实时推送到OSC
watch(() => recognition.interimText.value, (newText) => {
  scrollToBottom()
  
  if (!newText) {
    interimTranslation.value = ''
    return
  }
  
  // 翻译临时文本
  if (settings.value.enableTranslation && settings.value.targetLang) {
    debouncedTranslateInterim(newText)
  } else {
    interimTranslation.value = ''
    
    // 没有启用翻译时，直接发送原文
    if (hostBridge.isConnected.value) {
      debouncedSendInterim(newText)
    }
  }
})

watch(() => resultsManager.results.value.length, () => {
  scrollToBottom()
}, { flush: 'post' })

// 检查是否包含敏感 API Key
const hasSensitiveData = (settings) => {
  const apiKeys = settings.apiKeys || {}
  return !!(
    apiKeys.deepl ||
    apiKeys.xiaoniu ||
    apiKeys.youdao?.appKey ||
    apiKeys.tencent?.secretId ||
    apiKeys.ai?.apiKey
  )
}

// 首次保存敏感数据时显示警告
let hasShownSecurityWarning = false

watch(settings, (newSettings) => {
  // 检查是否包含敏感数据且未显示过警告
  if (hasSensitiveData(newSettings) && !hasShownSecurityWarning) {
    hasShownSecurityWarning = true
    showSnackbar('⚠️ API Key 已保存到本地存储，请注意安全风险', 'warning')
    console.warn('🔒 安全提示：API Key 存储在浏览器 localStorage 中，请勿在公共设备上使用')
  }
  
  localStorage.setItem('speech-settings', JSON.stringify(newSettings))
}, { deep: true })
</script>

<style>
/* App 组件样式已移至 global.css */
</style>