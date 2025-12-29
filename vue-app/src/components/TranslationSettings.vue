<template>
  <v-container class="pa-0">
    <v-card class="pa-6" elevation="2">
      <v-card-title class="text-h5 mb-4">
        <v-icon class="me-2">mdi-translate</v-icon>
        翻译服务配置
      </v-card-title>

      <v-card-subtitle class="mb-4">
        配置机器翻译和 AI 翻译服务的 API 密钥
      </v-card-subtitle>

      <v-tabs v-model="currentTab" color="primary" class="mb-4">
        <v-tab value="machine">
          <v-icon start>mdi-robot-outline</v-icon>
          机器翻译
        </v-tab>
        <v-tab value="ai">
          <v-icon start>mdi-brain</v-icon>
          AI 翻译
        </v-tab>
      </v-tabs>

      <v-window v-model="currentTab">
        <!-- 机器翻译标签页 -->
        <v-window-item value="machine">
          <v-card flat class="scrollable-content">
            <!-- DeepL API -->
            <div class="api-config-section mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-1">🔵 DeepL API</span>
                <v-chip size="x-small" color="warning" variant="outlined" class="ml-2">需要密钥</v-chip>
              </div>
              <v-text-field
                v-model="localSettings.deepl"
                label="DeepL API Key"
                variant="outlined"
                density="comfortable"
                type="password"
                hint="从 https://www.deepl.com/pro-api 获取"
                persistent-hint
                @update:model-value="emitUpdate"
              />
            </div>

            <!-- 小牛翻译 API -->
            <div class="api-config-section mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-1">🐮 小牛翻译 API</span>
                <v-chip size="x-small" color="warning" variant="outlined" class="ml-2">需要密钥</v-chip>
              </div>
              <v-text-field
                v-model="localSettings.xiaoniu"
                label="小牛翻译 API Key"
                variant="outlined"
                density="comfortable"
                type="password"
                hint="从 https://niutrans.com 获取"
                persistent-hint
                @update:model-value="emitUpdate"
              />
            </div>

            <!-- 有道翻译 API -->
            <div class="api-config-section mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-1">📖 有道翻译 API</span>
                <v-chip size="x-small" color="warning" variant="outlined" class="ml-2">需要配置</v-chip>
              </div>
              <v-text-field
                v-model="localSettings.youdao.appKey"
                label="应用 ID (APP Key)"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                @update:model-value="emitUpdate"
              />
              <v-text-field
                v-model="localSettings.youdao.appSecret"
                label="应用密钥 (APP Secret)"
                variant="outlined"
                density="comfortable"
                type="password"
                hint="从 https://ai.youdao.com 获取"
                persistent-hint
                @update:model-value="emitUpdate"
              />
            </div>

            <!-- 腾讯云翻译 API -->
            <div class="api-config-section mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-1">🐧 腾讯云翻译 API</span>
                <v-chip size="x-small" color="warning" variant="outlined" class="ml-2">需要配置</v-chip>
              </div>
              <v-text-field
                v-model="localSettings.tencent.secretId"
                label="Secret ID"
                variant="outlined"
                density="comfortable"
                class="mb-2"
                @update:model-value="emitUpdate"
              />
              <v-text-field
                v-model="localSettings.tencent.secretKey"
                label="Secret Key"
                variant="outlined"
                density="comfortable"
                type="password"
                hint="从腾讯云控制台获取"
                persistent-hint
                @update:model-value="emitUpdate"
              />
            </div>

            <!-- DeepLX 自建服务 -->
            <div class="api-config-section">
              <div class="d-flex align-center mb-2">
                <span class="text-subtitle-1">🔷 DeepLX 自建服务</span>
                <v-chip size="x-small" color="info" variant="outlined" class="ml-2">实验性</v-chip>
              </div>
              <v-text-field
                v-model="localSettings.deeplx.endpoint"
                label="DeepLX 服务地址"
                variant="outlined"
                density="comfortable"
                placeholder="http://localhost:1188/translate"
                hint="自建 DeepLX 服务的 API 地址"
                persistent-hint
                @update:model-value="emitUpdate"
              />
            </div>
          </v-card>
        </v-window-item>

        <!-- AI 翻译标签页 -->
        <v-window-item value="ai">
          <v-card flat class="scrollable-content">
            <!-- 统一的 AI 翻译配置 -->
            <div class="api-config-section">
              <div class="d-flex align-center mb-3">
                <span class="text-subtitle-1">🤖 AI 翻译服务</span>
                <v-chip size="x-small" color="success" variant="outlined" class="ml-2">统一配置</v-chip>
              </div>

              <!-- 提供商选择 -->
              <v-select
                v-model="localSettings.ai.provider"
                :items="providerOptions"
                label="AI 提供商"
                variant="outlined"
                density="comfortable"
                class="mb-3"
                @update:model-value="handleProviderChange"
              >
                <template v-slot:prepend-inner>
                  <v-icon>{{ currentProviderIcon }}</v-icon>
                </template>
                <template v-slot:item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template v-slot:prepend>
                      <v-icon>{{ item.raw.icon }}</v-icon>
                    </template>
                    <template v-slot:append v-if="!item.raw.requiresKey">
                      <v-chip size="x-small" color="success" variant="flat">免费</v-chip>
                    </template>
                  </v-list-item>
                </template>
              </v-select>

              <!-- 提供商说明 -->
              <v-alert
                v-if="currentProviderInfo"
                type="info"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                <div class="text-caption">
                  <strong>{{ currentProviderInfo.name }}</strong>
                  <div class="mt-1">{{ currentProviderInfo.description }}</div>
                </div>
              </v-alert>

              <!-- API Key（某些提供商需要） -->
              <v-text-field
                v-if="currentProviderPreset.requiresKey"
                v-model="localSettings.ai.apiKey"
                label="API Key"
                variant="outlined"
                density="comfortable"
                type="password"
                :hint="currentProviderPreset.apiKeyHint"
                persistent-hint
                class="mb-3"
                @update:model-value="emitUpdate"
              />

              <!-- Base URL -->
              <v-text-field
                v-model="localSettings.ai.baseURL"
                label="Base URL"
                variant="outlined"
                density="comfortable"
                :placeholder="currentProviderPreset.baseURL"
                hint="留空使用默认地址，或填写代理地址"
                persistent-hint
                class="mb-3"
                @update:model-value="emitUpdate"
              />

              <!-- 模型选择 -->
              <v-autocomplete
                v-model="localSettings.ai.model"
                :items="availableModels"
                label="模型"
                variant="outlined"
                density="comfortable"
                :placeholder="currentProviderPreset.defaultModel"
                :hint="availableModels.length > 0 ? `找到 ${availableModels.length} 个可用模型` : '留空使用默认模型'"
                persistent-hint
                clearable
                class="mb-3"
                @update:model-value="emitUpdate"
              >
                <template v-slot:append>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    :loading="loadingModels"
                    @click="fetchModels"
                  >
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </template>
              </v-autocomplete>

              <!-- 高级设置折叠面板 -->
              <v-expansion-panels class="mb-3">
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon start>mdi-tune</v-icon>
                    高级设置
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <!-- 系统提示词 -->
                    <v-textarea
                      v-model="localSettings.ai.systemPrompt"
                      label="系统提示词（可选）"
                      variant="outlined"
                      density="comfortable"
                      rows="3"
                      placeholder="你是一个专业的翻译助手..."
                      hint="自定义系统提示词，留空使用默认"
                      persistent-hint
                      class="mb-3"
                      @update:model-value="emitUpdate"
                    />

                    <!-- 用户提示词模板 -->
                    <v-textarea
                      v-model="localSettings.ai.userPrompt"
                      label="用户提示词模板（可选）"
                      variant="outlined"
                      density="comfortable"
                      rows="3"
                      placeholder="请将以下文本从 {sourceLang} 翻译成 {targetLang}：{text}"
                      hint="使用 {sourceLang}、{targetLang}、{text} 作为占位符"
                      persistent-hint
                      class="mb-3"
                      @update:model-value="emitUpdate"
                    />

                    <!-- Temperature -->
                    <v-slider
                      v-model="localSettings.ai.temperature"
                      label="Temperature"
                      :min="0"
                      :max="2"
                      :step="0.1"
                      thumb-label
                      class="mb-3"
                      @update:model-value="emitUpdate"
                    >
                      <template v-slot:append>
                        <span class="text-caption">{{ localSettings.ai.temperature }}</span>
                      </template>
                    </v-slider>

                    <!-- Max Tokens -->
                    <v-text-field
                      v-model.number="localSettings.ai.maxTokens"
                      label="最大 Token 数"
                      variant="outlined"
                      density="comfortable"
                      type="number"
                      hint="翻译结果的最大长度"
                      persistent-hint
                      @update:model-value="emitUpdate"
                    />
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <!-- 测试和工具按钮 -->
              <div class="d-flex gap-2 flex-wrap mb-3">
                <v-btn
                  size="small"
                  variant="outlined"
                  color="primary"
                  :loading="testingConnection"
                  @click="testConnection"
                >
                  <v-icon start size="small">mdi-connection</v-icon>
                  测试连接
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  color="success"
                  :loading="testingTranslation"
                  @click="testTranslation"
                >
                  <v-icon start size="small">mdi-translate</v-icon>
                  测试翻译
                </v-btn>
                <v-btn
                  size="small"
                  variant="outlined"
                  :loading="loadingModels"
                  @click="fetchModels"
                >
                  <v-icon start size="small">mdi-format-list-bulleted</v-icon>
                  获取模型
                </v-btn>
              </div>

              <!-- 测试结果显示 -->
              <v-alert
                v-if="testResult"
                :type="testResult.type"
                variant="tonal"
                density="compact"
                closable
                class="mb-3"
                @click:close="testResult = null"
              >
                <div class="text-caption">
                  <strong>{{ testResult.title }}</strong>
                  <div class="mt-1">{{ testResult.message }}</div>
                  <div v-if="testResult.details" class="mt-2 text-caption">
                    <pre style="white-space: pre-wrap; font-size: 0.75rem;">{{ testResult.details }}</pre>
                  </div>
                </div>
              </v-alert>

              <!-- 快速配置按钮 -->
              <div class="d-flex gap-2 flex-wrap">
                <v-btn
                  v-for="preset in quickPresets"
                  :key="preset.provider"
                  size="small"
                  variant="outlined"
                  @click="applyQuickPreset(preset)"
                >
                  <v-icon start size="small">{{ preset.icon }}</v-icon>
                  {{ preset.name }}
                </v-btn>
              </div>
            </div>
          </v-card>
        </v-window-item>
      </v-window>

      <!-- 操作按钮 -->
      <v-card-actions class="mt-6">
        <v-spacer />
        <v-btn
          color="primary"
          variant="text"
          @click="resetSettings"
        >
          <v-icon start>mdi-refresh</v-icon>
          重置
        </v-btn>
        <v-btn
          color="success"
          variant="elevated"
          @click="saveSettings"
        >
          <v-icon start>mdi-content-save</v-icon>
          保存
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- 安全警告 -->
    <v-alert
      type="warning"
      variant="tonal"
      class="mt-4"
      icon="mdi-shield-alert"
      prominent
    >
      <div class="text-body-2">
        <strong>⚠️ 安全提示：</strong>
        <ul class="mt-2">
          <li><strong>API Key 存储在浏览器本地存储中，可能存在安全风险</strong></li>
          <li>请勿在公共或共享设备上保存敏感的 API Key</li>
          <li>建议使用具有使用限制的 API Key，避免滥用</li>
          <li>如需更高安全性，请使用桌面版或通过代理服务器调用</li>
        </ul>
      </div>
    </v-alert>

    <!-- 提示信息 -->
    <v-alert
      type="info"
      variant="tonal"
      class="mt-4"
      icon="mdi-information"
    >
      <div class="text-body-2">
        <strong>使用提示：</strong>
        <ul class="mt-2">
          <li>机器翻译服务（如 Google、Microsoft）无需配置，开箱即用</li>
          <li>AI 翻译服务支持 OpenAI、Gemini、Claude、Ollama、LM Studio 等</li>
          <li>配置会自动保存到浏览器本地存储</li>
          <li>Ollama 和 LM Studio 无需 API Key，适合本地部署</li>
        </ul>
      </div>
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { AI_PROVIDER_PRESETS } from '../composables/translation/constants'
import { fetchAvailableModels, testAIConnection, testTranslation as testAITranslation } from '../composables/translation/services/ai'

// Props
const props = defineProps({
  apiKeys: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['update:apiKeys'])

// 当前标签页
const currentTab = ref('machine')

// 提供商选项
const providerOptions = [
  { title: '🤖 OpenAI', value: 'openai', icon: 'mdi-robot', requiresKey: true },
  { title: '✨ Google Gemini', value: 'gemini', icon: 'mdi-google', requiresKey: true },
  { title: '🧠 Anthropic Claude', value: 'claude', icon: 'mdi-brain', requiresKey: true },
  { title: '🦙 Ollama (本地)', value: 'ollama', icon: 'mdi-llama', requiresKey: false },
  { title: '🖥️ LM Studio (本地)', value: 'lm-studio', icon: 'mdi-desktop-tower', requiresKey: false },
  { title: '⚙️ 自定义', value: 'custom', icon: 'mdi-cog', requiresKey: false }
]

// 快速预设
const quickPresets = [
  { provider: 'ollama', name: 'Ollama', icon: 'mdi-llama' },
  { provider: 'lm-studio', name: 'LM Studio', icon: 'mdi-desktop-tower' }
]

// 提供商信息
const providerDescriptions = {
  openai: { name: 'OpenAI', description: '支持 GPT-4、GPT-3.5 等模型，翻译质量高，需要 API Key' },
  gemini: { name: 'Google Gemini', description: 'Google 最新 AI 模型，支持多语言翻译，需要 API Key' },
  claude: { name: 'Anthropic Claude', description: 'Claude 系列模型，擅长理解上下文，需要 API Key' },
  ollama: { name: 'Ollama', description: '本地运行的开源模型，无需 API Key，需要本地安装 Ollama' },
  'lm-studio': { name: 'LM Studio', description: '本地运行的模型服务器，无需 API Key，需要本地安装 LM Studio' },
  custom: { name: '自定义', description: '兼容 OpenAI API 格式的任意服务' }
}

// 可用模型列表
const availableModels = ref([])
const loadingModels = ref(false)

// 测试状态
const testingConnection = ref(false)
const testingTranslation = ref(false)
const testResult = ref(null)

// 本地设置（深拷贝 props）
const localSettings = ref({
  deepl: props.apiKeys.deepl || '',
  xiaoniu: props.apiKeys.xiaoniu || '',
  youdao: {
    appKey: props.apiKeys.youdao?.appKey || '',
    appSecret: props.apiKeys.youdao?.appSecret || ''
  },
  tencent: {
    secretId: props.apiKeys.tencent?.secretId || '',
    secretKey: props.apiKeys.tencent?.secretKey || ''
  },
  deeplx: {
    endpoint: props.apiKeys.deeplx?.endpoint || ''
  },
  ai: {
    provider: props.apiKeys.ai?.provider || 'openai',
    apiKey: props.apiKeys.ai?.apiKey || '',
    baseURL: props.apiKeys.ai?.baseURL || '',
    model: props.apiKeys.ai?.model || '',
    systemPrompt: props.apiKeys.ai?.systemPrompt || '',
    userPrompt: props.apiKeys.ai?.userPrompt || '',
    temperature: props.apiKeys.ai?.temperature ?? 0.3,
    maxTokens: props.apiKeys.ai?.maxTokens ?? 1000
  }
})

// 当前提供商预设
const currentProviderPreset = computed(() => {
  return AI_PROVIDER_PRESETS[localSettings.value.ai.provider] || AI_PROVIDER_PRESETS.custom
})

// 当前提供商图标
const currentProviderIcon = computed(() => {
  const option = providerOptions.find(opt => opt.value === localSettings.value.ai.provider)
  return option?.icon || 'mdi-cog'
})

// 当前提供商信息
const currentProviderInfo = computed(() => {
  return providerDescriptions[localSettings.value.ai.provider]
})

// 处理提供商切换
const handleProviderChange = (provider) => {
  const preset = AI_PROVIDER_PRESETS[provider]
  if (preset) {
    // 自动填充默认值
    if (!localSettings.value.ai.baseURL) {
      localSettings.value.ai.baseURL = preset.baseURL
    }
    if (!localSettings.value.ai.model) {
      localSettings.value.ai.model = preset.defaultModel
    }
  }
  emitUpdate()
}

// 应用快速预设
const applyQuickPreset = (preset) => {
  localSettings.value.ai.provider = preset.provider
  const providerPreset = AI_PROVIDER_PRESETS[preset.provider]
  if (providerPreset) {
    localSettings.value.ai.baseURL = providerPreset.baseURL
    localSettings.value.ai.model = providerPreset.defaultModel
    localSettings.value.ai.apiKey = ''
  }
  emitUpdate()
}

// 获取可用模型列表
const fetchModels = async () => {
  loadingModels.value = true
  testResult.value = null
  
  try {
    const models = await fetchAvailableModels(localSettings.value.ai)
    availableModels.value = models
    
    testResult.value = {
      type: 'success',
      title: '获取模型成功',
      message: `找到 ${models.length} 个可用模型`,
      details: models.length > 10 ? `前 10 个: ${models.slice(0, 10).join(', ')}...` : models.join(', ')
    }
  } catch (error) {
    testResult.value = {
      type: 'error',
      title: '获取模型失败',
      message: error.message || '无法获取模型列表',
      details: error.stack
    }
    availableModels.value = []
  } finally {
    loadingModels.value = false
  }
}

// 测试连接
const testConnection = async () => {
  testingConnection.value = true
  testResult.value = null
  
  try {
    const result = await testAIConnection(localSettings.value.ai)
    
    testResult.value = {
      type: result.success ? 'success' : 'error',
      title: result.success ? '连接测试成功' : '连接测试失败',
      message: result.message,
      details: result.details ? JSON.stringify(result.details, null, 2) : null
    }
    
    // 如果连接成功，自动获取模型列表
    if (result.success && result.details?.models) {
      availableModels.value = result.details.models
    }
  } catch (error) {
    testResult.value = {
      type: 'error',
      title: '连接测试失败',
      message: error.message || '测试过程中发生错误',
      details: error.stack
    }
  } finally {
    testingConnection.value = false
  }
}

// 测试翻译
const testTranslation = async () => {
  testingTranslation.value = true
  testResult.value = null
  
  try {
    const result = await testAITranslation(localSettings.value.ai)
    
    testResult.value = {
      type: result.success ? 'success' : 'error',
      title: result.success ? '翻译测试成功' : '翻译测试失败',
      message: result.message,
      details: result.success
        ? `原文: "Hello, world!"\n译文: "${result.translatedText}"\n耗时: ${result.duration}ms`
        : `耗时: ${result.duration}ms`
    }
  } catch (error) {
    testResult.value = {
      type: 'error',
      title: '翻译测试失败',
      message: error.message || '测试过程中发生错误',
      details: error.stack
    }
  } finally {
    testingTranslation.value = false
  }
}

// 监听 props 变化
watch(() => props.apiKeys, (newValue) => {
  localSettings.value = {
    deepl: newValue.deepl || '',
    xiaoniu: newValue.xiaoniu || '',
    youdao: {
      appKey: newValue.youdao?.appKey || '',
      appSecret: newValue.youdao?.appSecret || ''
    },
    tencent: {
      secretId: newValue.tencent?.secretId || '',
      secretKey: newValue.tencent?.secretKey || ''
    },
    deeplx: {
      endpoint: newValue.deeplx?.endpoint || ''
    },
    ai: {
      provider: newValue.ai?.provider || 'openai',
      apiKey: newValue.ai?.apiKey || '',
      baseURL: newValue.ai?.baseURL || '',
      model: newValue.ai?.model || '',
      systemPrompt: newValue.ai?.systemPrompt || '',
      userPrompt: newValue.ai?.userPrompt || '',
      temperature: newValue.ai?.temperature ?? 0.3,
      maxTokens: newValue.ai?.maxTokens ?? 1000
    }
  }
}, { deep: true })

// 发送更新
const emitUpdate = () => {
  emit('update:apiKeys', localSettings.value)
}

// 保存设置
const saveSettings = () => {
  emitUpdate()
  // 可以添加保存成功的提示
}

// 重置设置
const resetSettings = () => {
  localSettings.value = {
    deepl: '',
    xiaoniu: '',
    youdao: { appKey: '', appSecret: '' },
    tencent: { secretId: '', secretKey: '' },
    deeplx: { endpoint: '' },
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
  }
  emitUpdate()
}
</script>

<style scoped>
/* API 配置区域样式已移至全局样式 global.css */

/* 滚动容器样式 */
.scrollable-content {
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
}

/* 自定义滚动条样式 */
.scrollable-content::-webkit-scrollbar {
  width: 8px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

/* Firefox 滚动条样式 */
.scrollable-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
}
</style>