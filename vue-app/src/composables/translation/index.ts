/**
 * 主翻译 Composable
 * 统一的翻译接口
 */

import { ref, computed } from 'vue'
import type { ServiceType, ServiceConfig, TranslationMessage } from './types'
import { 
  getTranslationService, 
  checkServiceAvailability,
  serviceOptions 
} from './services'

/**
 * 翻译状态
 */
interface TranslationState {
  isTranslating: boolean
  error: string | null
  lastTranslation: {
    text: string
    result: string
    service: ServiceType
    timestamp: number
  } | null
}

/**
 * 翻译 Composable
 */
export function useTranslation() {
  // 状态
  const state = ref<TranslationState>({
    isTranslating: false,
    error: null,
    lastTranslation: null
  })

  // 当前选择的服务
  const currentService = ref<ServiceType>('google')
  
  // 服务配置
  const config = ref<ServiceConfig>({})

  /**
   * 翻译文本
   */
  async function translate(
    message: TranslationMessage,
    sourceLang: string = 'auto',
    targetLang: string = 'zh-CN'
  ): Promise<string> {
    state.value.isTranslating = true
    state.value.error = null

    try {
      // 检查服务可用性
      const isAvailable = await checkServiceAvailability(currentService.value)
      if (!isAvailable) {
        throw new Error(`${currentService.value} 服务当前不可用`)
      }

      // 获取翻译服务
      const translationService = getTranslationService(currentService.value)
      
      // 执行翻译
      const result = await translationService(
        message.origin,
        sourceLang,
        targetLang,
        config.value
      )

      // 保存翻译结果
      state.value.lastTranslation = {
        text: message.origin,
        result,
        service: currentService.value,
        timestamp: Date.now()
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '翻译失败'
      state.value.error = errorMessage
      console.error('翻译失败:', error)
      throw error
    } finally {
      state.value.isTranslating = false
    }
  }

  /**
   * 批量翻译
   */
  async function translateBatch(
    messages: TranslationMessage[],
    sourceLang: string = 'auto',
    targetLang: string = 'zh-CN'
  ): Promise<string[]> {
    const results: string[] = []
    
    for (const message of messages) {
      try {
        const result = await translate(message, sourceLang, targetLang)
        results.push(result)
      } catch (error) {
        console.error('批量翻译中的项目失败:', error)
        results.push(message.origin) // 失败时返回原文
      }
    }
    
    return results
  }

  /**
   * 切换翻译服务
   */
  function setService(service: ServiceType) {
    currentService.value = service
    state.value.error = null
  }

  /**
   * 更新服务配置
   */
  function updateConfig(newConfig: Partial<ServiceConfig>) {
    config.value = {
      ...config.value,
      ...newConfig
    }
  }

  /**
   * 清除错误
   */
  function clearError() {
    state.value.error = null
  }

  /**
   * 重置状态
   */
  function reset() {
    state.value = {
      isTranslating: false,
      error: null,
      lastTranslation: null
    }
  }

  // 计算属性
  const isTranslating = computed(() => state.value.isTranslating)
  const error = computed(() => state.value.error)
  const lastTranslation = computed(() => state.value.lastTranslation)
  const availableServices = computed(() => serviceOptions)
  const currentServiceInfo = computed(() => 
    serviceOptions.find(option => option.value === currentService.value)
  )

  return {
    // 状态
    isTranslating,
    error,
    lastTranslation,
    currentService,
    availableServices,
    currentServiceInfo,
    
    // 方法
    translate,
    translateBatch,
    setService,
    updateConfig,
    clearError,
    reset
  }
}

// 默认导出
export default useTranslation

// 导出类型和服务
export * from './types'
export * from './services'