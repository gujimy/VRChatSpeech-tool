/**
 * 翻译功能 Composable
 *
 * 支持多种翻译服务（参考 FluentRead 项目）：
 * 1. Google Translate - 免费，无需 API Key
 * 2. Microsoft Translator - 通过 Edge 免费 Token
 * 3. DeepLX - 开源的 DeepL API（需本地部署）
 * 4. MyMemory - 免费 API
 * 5. Chrome Translation API（实验性，Chrome 138+）
 */

import { ref, computed } from 'vue'
import { LRUCache } from './useLRUCache'

export function useTranslation() {
  // 状态
  const isTranslating = ref(false)
  const isAvailable = ref(false)
  const error = ref(null)
  const translationMethod = ref('none') // 'google', 'microsoft', 'deeplx', 'mymemory', 'chrome', 'none'
  
  // 当前选择的翻译服务
  const selectedService = ref('google') // 默认使用 Google
  
  // 可用的翻译服务列表
  const availableServices = ref([])
  
  // 翻译服务配置
  const serviceConfig = ref({
    deeplx: {
      url: 'http://localhost:1188/translate',
      token: ''
    }
  })
  
  // 语言映射
  const languageMap = {
    'zh-CN': { code: 'zh', name: '中文（简体）', google: 'zh-CN', microsoft: 'zh-Hans' },
    'zh-TW': { code: 'zh-TW', name: '中文（繁体）', google: 'zh-TW', microsoft: 'zh-Hant' },
    'en-US': { code: 'en', name: 'English', google: 'en', microsoft: 'en' },
    'ja-JP': { code: 'ja', name: '日本語', google: 'ja', microsoft: 'ja' },
    'ko-KR': { code: 'ko', name: '한국어', google: 'ko', microsoft: 'ko' },
    'es-ES': { code: 'es', name: 'Español', google: 'es', microsoft: 'es' },
    'fr-FR': { code: 'fr', name: 'Français', google: 'fr', microsoft: 'fr' },
    'de-DE': { code: 'de', name: 'Deutsch', google: 'de', microsoft: 'de' },
    'ru-RU': { code: 'ru', name: 'Русский', google: 'ru', microsoft: 'ru' },
    'pt-BR': { code: 'pt', name: 'Português', google: 'pt', microsoft: 'pt' }
  }
  
  // 翻译服务选项（供 UI 使用）
  const serviceOptions = [
    { title: 'Google 翻译', value: 'google', icon: '🌐', free: true },
    { title: '微软翻译', value: 'microsoft', icon: '🔷', free: true },
    { title: 'DeepLX (本地)', value: 'deeplx', icon: '🔷', free: true, local: true },
    { title: 'MyMemory', value: 'mymemory', icon: '💾', free: true, limit: '500/天' },
    { title: 'Chrome 内置', value: 'chrome', icon: '🌐', free: true, experimental: true },
    // AI 翻译服务（统一）
    { title: 'AI 翻译', value: 'ai', icon: '🤖', free: false, apiKey: true, experimental: true }
  ]
  
  // 目标翻译语言选项
  const targetLanguageOptions = [
    { title: '不翻译', value: '' },
    { title: 'English', value: 'en' },
    { title: '中文（简体）', value: 'zh-CN' },
    { title: '中文（繁体）', value: 'zh-TW' },
    { title: '日本語', value: 'ja' },
    { title: '한국어', value: 'ko' },
    { title: 'Español', value: 'es' },
    { title: 'Français', value: 'fr' },
    { title: 'Deutsch', value: 'de' },
    { title: 'Русский', value: 'ru' },
    { title: 'Português', value: 'pt' }
  ]
  
  // 翻译器实例（Chrome Translation API）
  let translator = null
  
  // 微软翻译 Token 缓存
  let microsoftToken = null
  let microsoftTokenExpiry = 0
  
  /**
   * 初始化翻译功能
   */
  const init = async () => {
    availableServices.value = []
    
    // 检测 Chrome Translation API（实验性，Chrome 138+）
    if ('translation' in self && 'createTranslator' in self.translation) {
      availableServices.value.push('chrome')
      console.log('✅ Chrome Translation API 可用')
    }
    
    // Google 翻译始终可用（免费）
    availableServices.value.push('google')
    
    // 微软翻译始终可用（通过 Edge Token）
    availableServices.value.push('microsoft')
    
    // 检测 DeepLX 本地服务
    try {
      const response = await fetch(serviceConfig.value.deeplx.url.replace('/translate', '/'), {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      })
      if (response.ok) {
        availableServices.value.push('deeplx')
        console.log('✅ DeepLX 本地服务可用')
      }
    } catch (e) {
      console.log('ℹ️ DeepLX 本地服务未运行')
    }
    
    // MyMemory 始终可用
    availableServices.value.push('mymemory')
    
    // AI 翻译服务始终可用（配置后即可使用）
    availableServices.value.push('ai')
    console.log('✅ AI 翻译服务可用')
    
    // 加载保存的服务选择
    const savedService = localStorage.getItem('translation-service')
    if (savedService && availableServices.value.includes(savedService)) {
      selectedService.value = savedService
    } else {
      // 默认使用第一个可用的服务
      selectedService.value = availableServices.value[0] || 'google'
    }
    
    translationMethod.value = selectedService.value
    isAvailable.value = availableServices.value.length > 0
    console.log(`📡 当前翻译服务: ${getServiceName(selectedService.value)}`)
    console.log(`📋 可用服务: ${availableServices.value.map(s => getServiceName(s)).join(', ')}`)
    
    return true
  }
  
  /**
   * 切换翻译服务
   */
  const setService = (service) => {
    if (availableServices.value.includes(service)) {
      selectedService.value = service
      translationMethod.value = service
      localStorage.setItem('translation-service', service)
      console.log(`🔄 切换翻译服务: ${getServiceName(service)}`)
      // 清除翻译器缓存
      translator = null
    }
  }
  
  /**
   * 获取服务名称
   */
  const getServiceName = (service) => {
    const names = {
      'google': 'Google 翻译',
      'microsoft': '微软翻译',
      'deeplx': 'DeepLX',
      'mymemory': 'MyMemory',
      'chrome': 'Chrome 内置翻译',
      'ai': 'AI 翻译'
    }
    return names[service] || service
  }
  
  /**
   * 检测语言对是否支持
   */
  const checkLanguagePair = async (sourceLang, targetLang) => {
    if (translationMethod.value === 'chrome' && 'translation' in self) {
      try {
        const canTranslate = await self.translation.canTranslate({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        })
        return canTranslate !== 'no'
      } catch (e) {
        return false
      }
    }
    // MyMemory API 支持大多数语言对
    return true
  }
  
  /**
   * 创建翻译器（Chrome API）
   */
  const createTranslator = async (sourceLang, targetLang) => {
    if (translationMethod.value !== 'chrome' || !('translation' in self)) {
      return null
    }
    
    try {
      const canTranslate = await self.translation.canTranslate({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      })
      
      if (canTranslate === 'no') {
        throw new Error(`不支持从 ${sourceLang} 翻译到 ${targetLang}`)
      }
      
      translator = await self.translation.createTranslator({
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      })
      
      // 如果需要下载语言模型
      if (canTranslate === 'after-download') {
        translator.addEventListener('downloadprogress', (e) => {
          console.log(`下载翻译模型: ${Math.round(e.loaded / e.total * 100)}%`)
        })
        await translator.ready
      }
      
      return translator
    } catch (e) {
      console.error('创建翻译器失败:', e)
      return null
    }
  }
  
  /**
   * 使用 Chrome Translation API 翻译
   */
  const translateWithChrome = async (text, sourceLang, targetLang) => {
    if (!translator) {
      translator = await createTranslator(sourceLang, targetLang)
    }
    
    if (!translator) {
      throw new Error('无法创建翻译器')
    }
    
    return await translator.translate(text)
  }
  
  /**
   * 使用 Google Translate API（免费）
   * 参考 FluentRead 项目实现
   */
  const translateWithGoogle = async (text, sourceLang, targetLang) => {
    const fromLang = languageMap[sourceLang]?.google || sourceLang.split('-')[0] || 'auto'
    const toLang = languageMap[targetLang]?.google || targetLang.split('-')[0]
    
    const params = new URLSearchParams({
      client: 'gtx',
      sl: fromLang,
      tl: toLang,
      dt: 't',
      strip: '1',
      nonced: '1',
      q: text
    })
    
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const result = await response.json()
        let sentence = ''
        if (result[0]) {
          result[0].forEach((e) => {
            if (e[0]) sentence += e[0]
          })
        }
        return sentence || text
      } else {
        throw new Error(`翻译失败: ${response.status} ${response.statusText}`)
      }
    } catch (e) {
      console.error('Google 翻译失败:', e)
      throw e
    }
  }
  
  /**
   * 获取微软翻译 Token（通过 Edge 免费接口）
   */
  const getMicrosoftToken = async () => {
    const now = Date.now()
    if (microsoftToken && now < microsoftTokenExpiry) {
      return microsoftToken
    }
    
    try {
      const response = await fetch('https://edge.microsoft.com/translate/auth')
      if (response.ok) {
        microsoftToken = await response.text()
        // Token 有效期约 10 分钟，我们设置 8 分钟刷新
        microsoftTokenExpiry = now + 8 * 60 * 1000
        return microsoftToken
      }
      throw new Error('获取 Token 失败')
    } catch (e) {
      console.error('获取微软翻译 Token 失败:', e)
      throw e
    }
  }
  
  /**
   * 使用微软翻译 API（免费，通过 Edge Token）
   * 参考 FluentRead 项目实现
   */
  const translateWithMicrosoft = async (text, sourceLang, targetLang) => {
    const fromLang = languageMap[sourceLang]?.microsoft || ''
    const toLang = languageMap[targetLang]?.microsoft || targetLang.split('-')[0]
    
    try {
      const token = await getMicrosoftToken()
      
      const response = await fetch(
        `https://api-edge.cognitive.microsofttranslator.com/translate?from=${fromLang}&to=${toLang}&api-version=3.0&includeSentenceLength=true&textType=html`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify([{ Text: text }])
        }
      )
      
      if (response.ok) {
        const result = await response.json()
        return result[0]?.translations?.[0]?.text || text
      } else {
        throw new Error(`翻译失败: ${response.status} ${response.statusText}`)
      }
    } catch (e) {
      console.error('微软翻译失败:', e)
      throw e
    }
  }
  
  /**
   * 使用 DeepLX API（需本地部署）
   * 参考 FluentRead 项目实现
   */
  const translateWithDeepLX = async (text, sourceLang, targetLang) => {
    const fromLang = sourceLang === 'auto' ? 'auto' : sourceLang.split('-')[0].toUpperCase()
    let toLang = targetLang.split('-')[0].toUpperCase()
    // DeepL 不支持 zh-Hans，需要转换
    if (toLang === 'ZH') toLang = 'ZH'
    
    const url = serviceConfig.value.deeplx.url
    const headers = {
      'Content-Type': 'application/json'
    }
    
    if (serviceConfig.value.deeplx.token) {
      headers['Authorization'] = `Bearer ${serviceConfig.value.deeplx.token}`
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: text,
          source_lang: fromLang,
          target_lang: toLang
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        if (result.code === 200) {
          return result.data
        } else {
          throw new Error(result.message || 'DeepLX 翻译失败')
        }
      } else {
        throw new Error(`DeepLX 翻译失败: ${response.status}`)
      }
    } catch (e) {
      console.error('DeepLX 翻译失败:', e)
      throw e
    }
  }
  
  /**
   * 使用 MyMemory 免费 API 翻译
   * 限制：1000字符/请求，500请求/天（免费）
   */
  const translateWithMyMemory = async (text, sourceLang, targetLang) => {
    const fromLang = languageMap[sourceLang]?.code || sourceLang.split('-')[0]
    const toLang = targetLang.split('-')[0]
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return data.responseData.translatedText
      } else {
        throw new Error(data.responseDetails || '翻译失败')
      }
    } catch (e) {
      console.error('MyMemory 翻译失败:', e)
      throw e
    }
  }
  
  /**
   * 动态导入 AI 翻译服务
   */
  const loadAIService = async () => {
    try {
      const aiModule = await import('./translation/services/ai.ts')
      return aiModule.translateWithAI
    } catch (e) {
      console.error('加载 AI 翻译服务失败:', e)
      return null
    }
  }
  
  let aiService = null
  
  /**
   * 翻译文本
   * @param {string} text - 要翻译的文本
   * @param {string} sourceLang - 源语言代码（如 'zh-CN'）
   * @param {string} targetLang - 目标语言代码（如 'en'）
   * @param {object} apiKeys - API 配置（用于 AI 服务）
   * @returns {Promise<string>} - 翻译后的文本
   */
  const translate = async (text, sourceLang, targetLang, apiKeys = null) => {
    if (!text || !text.trim()) {
      return text
    }
    
    // 如果源语言和目标语言相同，直接返回
    const sourceBase = sourceLang.split('-')[0]
    const targetBase = targetLang.split('-')[0]
    if (sourceBase === targetBase) {
      return text
    }
    
    isTranslating.value = true
    error.value = null
    
    // 懒加载 AI 服务
    if (!aiService && selectedService.value === 'ai') {
      aiService = await loadAIService()
    }
    
    // 定义翻译方法优先级
    const translateMethods = {
      'google': translateWithGoogle,
      'microsoft': translateWithMicrosoft,
      'deeplx': translateWithDeepLX,
      'mymemory': translateWithMyMemory,
      'chrome': async (t, s, tg) => translateWithChrome(t, s.split('-')[0], tg.split('-')[0]),
      // AI 翻译服务（统一）
      'ai': aiService ? (t, s, tg) => aiService(t, s, tg, { ai: apiKeys?.ai }) : null
    }
    
    // 定义回退顺序
    const fallbackOrder = ['google', 'microsoft', 'mymemory']
    
    try {
      const currentMethod = selectedService.value
      const translateFn = translateMethods[currentMethod]
      
      if (translateFn) {
        try {
          const result = await translateFn(text, sourceLang, targetLang)
          return result
        } catch (e) {
          console.warn(`${getServiceName(currentMethod)} 翻译失败:`, e.message)
          
          // 尝试回退到其他服务
          for (const fallback of fallbackOrder) {
            if (fallback !== currentMethod && availableServices.value.includes(fallback)) {
              console.log(`🔄 回退到 ${getServiceName(fallback)}`)
              try {
                const fallbackFn = translateMethods[fallback]
                const result = await fallbackFn(text, sourceLang, targetLang)
                // 临时切换显示的方法（不保存）
                translationMethod.value = fallback
                return result
              } catch (e2) {
                console.warn(`${getServiceName(fallback)} 也失败:`, e2.message)
              }
            }
          }
          throw e
        }
      }
      
      throw new Error('没有可用的翻译服务')
    } catch (e) {
      error.value = e.message
      console.error('所有翻译服务都失败:', e)
      throw e
    } finally {
      isTranslating.value = false
    }
  }
  
  /**
   * 批量翻译（带 LRU 缓存）
   * 缓存最多 1000 条，1 小时后过期
   */
  const translationCache = new LRUCache(1000, 60 * 60 * 1000) // 1小时过期
  
  const translateWithCache = async (text, sourceLang, targetLang, apiKeys = null) => {
    const cacheKey = `${text}|${sourceLang}|${targetLang}|${selectedService.value}`
    
    // 尝试从缓存获取
    const cached = translationCache.get(cacheKey)
    if (cached !== undefined) {
      console.debug('🎯 翻译缓存命中:', text.substring(0, 30))
      return cached
    }
    
    // 缓存未命中，执行翻译
    const result = await translate(text, sourceLang, targetLang, apiKeys)
    translationCache.set(cacheKey, result)
    
    // 定期清理过期缓存（每100次翻译清理一次）
    if (translationCache.size % 100 === 0) {
      const cleaned = translationCache.cleanup()
      if (cleaned > 0) {
        console.debug(`🧹 清理了 ${cleaned} 条过期翻译缓存`)
      }
    }
    
    return result
  }
  
  /**
   * 获取缓存统计信息
   */
  const getCacheStats = () => {
    return translationCache.getStats()
  }
  
  /**
   * 清除翻译器和缓存
   */
  const cleanup = () => {
    translator = null
    translationCache.clear()
  }
  
  /**
   * 获取翻译方法描述
   */
  const methodDescription = computed(() => {
    return getServiceName(translationMethod.value)
  })
  
  /**
   * 获取当前服务的详细信息
   */
  const currentServiceInfo = computed(() => {
    const service = serviceOptions.find(s => s.value === selectedService.value)
    return service || { title: '未知', value: 'unknown', icon: 'mdi-help' }
  })
  
  return {
    // 状态
    isTranslating,
    isAvailable,
    error,
    translationMethod,
    methodDescription,
    selectedService,
    availableServices,
    currentServiceInfo,
    
    // 选项
    targetLanguageOptions,
    languageMap,
    serviceOptions,
    serviceConfig,
    
    // 方法
    init,
    translate,
    translateWithCache,
    checkLanguagePair,
    cleanup,
    setService,
    getServiceName,
    getCacheStats
  }
}