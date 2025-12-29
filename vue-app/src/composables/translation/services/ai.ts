/**
 * 统一的 AI 翻译服务
 * 自动适配不同的 AI 提供商（OpenAI、Gemini、Claude、Ollama 等）
 */

import type { TranslateFunction, ServiceConfig, AIProvider } from '../types'
import {
  AI_LANGUAGE_NAMES,
  DEFAULT_AI_SYSTEM_PROMPT,
  DEFAULT_AI_USER_PROMPT,
  AI_PROVIDER_PRESETS
} from '../constants'

/**
 * OpenAI 格式的请求/响应接口
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIRequest {
  model: string
  temperature: number
  max_tokens?: number
  messages: OpenAIMessage[]
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * Gemini 格式的请求/响应接口
 */
interface GeminiContent {
  role: string
  parts: Array<{ text: string }>
}

interface GeminiRequest {
  contents: GeminiContent[]
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

/**
 * Claude 格式的请求/响应接口
 */
interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeRequest {
  model: string
  max_tokens: number
  system: string
  messages: ClaudeMessage[]
}

interface ClaudeResponse {
  content: Array<{
    type: string
    text: string
  }>
}

/**
 * 统一的 AI 翻译服务入口
 */
export const translateWithAI: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  const aiConfig = config?.ai
  
  if (!aiConfig) {
    throw new Error('AI 翻译配置未设置')
  }
  
  // 根据提供商类型选择对应的实现
  switch (aiConfig.provider) {
    case 'openai':
    case 'ollama':
    case 'lm-studio':
    case 'custom':
      return await translateWithOpenAIFormat(text, targetLang, aiConfig)
    case 'gemini':
      return await translateWithGeminiFormat(text, targetLang, aiConfig)
    case 'claude':
      return await translateWithClaudeFormat(text, targetLang, aiConfig)
    default:
      throw new Error(`不支持的 AI 提供商: ${aiConfig.provider}`)
  }
}

/**
 * OpenAI 格式的翻译
 * 支持: OpenAI、OpenRouter、DeepSeek、Ollama、LM Studio 等
 */
async function translateWithOpenAIFormat(
  text: string,
  targetLang: string,
  config: any
): Promise<string> {
  const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
  
  // 获取配置
  const preset = AI_PROVIDER_PRESETS[config.provider as AIProvider]
  const baseURL = config.baseURL || preset.baseURL
  const model = config.model || preset.defaultModel
  
  // 构建 URL
  const url = baseURL.endsWith('/chat/completions') 
    ? baseURL 
    : `${baseURL}/chat/completions`
  
  // 构建提示词
  const systemPrompt = config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT
  const userPrompt = (config.userPrompt || DEFAULT_AI_USER_PROMPT)
    .replace('{{to}}', targetLanguage)
    .replace('{{origin}}', text)
  
  // 构建请求体
  const requestBody: OpenAIRequest = {
    model,
    temperature: config.temperature ?? 1.0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }
  
  // 添加 max_tokens（如果配置了）
  if (config.maxTokens) {
    requestBody.max_tokens = config.maxTokens
  }
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // 本地模型（Ollama、LM Studio）通常不需要 API Key
    if (config.apiKey && !['ollama', 'lm-studio'].includes(config.provider)) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      throw await handleAPIError(response, preset.name, { url, model, textLength: text.length })
    }
    
    const data: OpenAIResponse = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      console.error(`${preset.name} API 返回结果为空:`, { model, textLength: text.length })
      throw new Error(`${preset.name} API 返回结果为空`)
    }
    
    const translatedText = data.choices[0].message.content.trim()
    
    if (!translatedText) {
      console.warn(`${preset.name} 翻译结果为空，返回原文本`, { model, originalText: text.substring(0, 50) })
      return text
    }
    
    return translatedText
  } catch (error) {
    console.error(`${preset.name} 翻译失败:`, {
      provider: config.provider,
      model,
      sourceLang: 'auto',
      targetLang,
      textLength: text.length,
      baseURL
    }, error)
    
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`${preset.name} 翻译服务出错`)
  }
}

/**
 * Gemini 格式的翻译
 */
async function translateWithGeminiFormat(
  text: string,
  targetLang: string,
  config: any
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('Gemini API Key 未配置')
  }
  
  const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
  const preset = AI_PROVIDER_PRESETS.gemini
  const model = config.model || preset.defaultModel
  
  // 构建提示词
  const userPrompt = (config.userPrompt || DEFAULT_AI_USER_PROMPT)
    .replace('{{to}}', targetLanguage)
    .replace('{{origin}}', text)
  
  // 构建 URL
  const url = config.baseURL
    ? `${config.baseURL}/v1beta/models/${model}:generateContent?key=${config.apiKey}`
    : `${preset.baseURL}/v1beta/models/${model}:generateContent?key=${config.apiKey}`
  
  const requestBody: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }]
      }
    ]
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      throw await handleAPIError(response, preset.name, { 
        url: url.replace(/key=[^&]+/, 'key=***'), 
        model, 
        textLength: text.length 
      })
    }
    
    const data: GeminiResponse = await response.json()
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error(`${preset.name} API 返回结果为空:`, { model, textLength: text.length })
      throw new Error(`${preset.name} API 返回结果为空`)
    }
    
    const translatedText = data.candidates[0].content.parts[0].text.trim()
    
    if (!translatedText) {
      console.warn(`${preset.name} 翻译结果为空，返回原文本`, { model, originalText: text.substring(0, 50) })
      return text
    }
    
    return translatedText
  } catch (error) {
    console.error(`${preset.name} 翻译失败:`, {
      provider: 'gemini',
      model,
      sourceLang: 'auto',
      targetLang,
      textLength: text.length
    }, error)
    
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`${preset.name} 翻译服务出错`)
  }
}

/**
 * Claude 格式的翻译
 */
async function translateWithClaudeFormat(
  text: string,
  targetLang: string,
  config: any
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('Claude API Key 未配置')
  }
  
  const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
  const preset = AI_PROVIDER_PRESETS.claude
  const model = config.model || preset.defaultModel
  const baseURL = config.baseURL || preset.baseURL
  
  // 构建提示词
  const systemPrompt = config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT
  const userPrompt = (config.userPrompt || DEFAULT_AI_USER_PROMPT)
    .replace('{{to}}', targetLanguage)
    .replace('{{origin}}', text)
  
  const requestBody: ClaudeRequest = {
    model,
    max_tokens: config.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  }
  
  try {
    const response = await fetch(`${baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })
    
    if (!response.ok) {
      throw await handleAPIError(response, preset.name, { 
        url: `${baseURL}/v1/messages`, 
        model, 
        textLength: text.length 
      })
    }
    
    const data: ClaudeResponse = await response.json()
    
    if (!data.content || data.content.length === 0) {
      console.error(`${preset.name} API 返回结果为空:`, { model, textLength: text.length })
      throw new Error(`${preset.name} API 返回结果为空`)
    }
    
    const translatedText = data.content[0].text.trim()
    
    if (!translatedText) {
      console.warn(`${preset.name} 翻译结果为空，返回原文本`, { model, originalText: text.substring(0, 50) })
      return text
    }
    
    return translatedText
  } catch (error) {
    console.error(`${preset.name} 翻译失败:`, {
      provider: 'claude',
      model,
      sourceLang: 'auto',
      targetLang,
      textLength: text.length,
      baseURL
    }, error)
    
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`${preset.name} 翻译服务出错`)
  }
}

/**
 * 统一的错误处理
 */
async function handleAPIError(
  response: Response,
  serviceName: string,
  context: { url: string; model?: string; textLength: number }
): Promise<Error> {
  const errorText = await response.text()
  
  console.error(`${serviceName} API 请求失败:`, {
    ...context,
    status: response.status,
    statusText: response.statusText
  }, errorText)
  
  // 根据状态码提供友好的错误消息
  const errorMessages: Record<number, string> = {
    400: '请求参数错误，请检查配置',
    401: 'API Key 无效或未授权',
    403: '访问被拒绝，请检查权限',
    404: 'API 端点不存在，请检查 Base URL',
    429: '请求频率超限，请稍后重试',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂时不可用'
  }
  
  const userMessage = errorMessages[response.status] || '未知错误'
  return new Error(`${serviceName} ${userMessage} (${response.status})`)
}

/**
 * 获取可用模型列表
 */
export async function fetchAvailableModels(config: any): Promise<string[]> {
  const preset = AI_PROVIDER_PRESETS[config.provider as AIProvider]
  
  if (!preset) {
    throw new Error(`不支持的 AI 提供商: ${config.provider}`)
  }
  
  try {
    // 根据不同提供商使用不同的 API
    switch (config.provider) {
      case 'openai':
      case 'custom':
        return await fetchOpenAIModels(config, preset)
      case 'ollama':
        return await fetchOllamaModels(config, preset)
      case 'lm-studio':
        return await fetchLMStudioModels(config, preset)
      case 'gemini':
        return await fetchGeminiModels(config, preset)
      case 'claude':
        // Claude 不提供模型列表 API，返回预设模型
        return [
          'claude-sonnet-4-0',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229'
        ]
      default:
        throw new Error(`${preset.name} 不支持获取模型列表`)
    }
  } catch (error) {
    console.error(`获取 ${preset.name} 模型列表失败:`, error)
    throw error
  }
}

/**
 * 获取 OpenAI 格式的模型列表
 */
async function fetchOpenAIModels(config: any, preset: any): Promise<string[]> {
  const baseURL = config.baseURL || preset.baseURL
  const url = baseURL.endsWith('/models') ? baseURL : `${baseURL}/models`
  
  const headers: Record<string, string> = {}
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }
  
  const response = await fetch(url, { headers })
  
  if (!response.ok) {
    throw new Error(`获取模型列表失败: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('模型列表格式错误')
  }
  
  return data.data
    .map((model: any) => model.id)
    .filter((id: string) => id && typeof id === 'string')
    .sort()
}

/**
 * 获取 Ollama 模型列表
 */
async function fetchOllamaModels(config: any, preset: any): Promise<string[]> {
  const baseURL = config.baseURL || preset.baseURL
  // Ollama 使用 /api/tags 端点
  const url = baseURL.replace('/v1', '/api/tags')
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`获取 Ollama 模型列表失败: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.models || !Array.isArray(data.models)) {
    return []
  }
  
  return data.models
    .map((model: any) => model.name)
    .filter((name: string) => name && typeof name === 'string')
    .sort()
}

/**
 * 获取 LM Studio 模型列表
 */
async function fetchLMStudioModels(config: any, preset: any): Promise<string[]> {
  const baseURL = config.baseURL || preset.baseURL
  const url = baseURL.endsWith('/models') ? baseURL : `${baseURL}/models`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`获取 LM Studio 模型列表失败: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.data || !Array.isArray(data.data)) {
    return []
  }
  
  return data.data
    .map((model: any) => model.id)
    .filter((id: string) => id && typeof id === 'string')
    .sort()
}

/**
 * 获取 Gemini 模型列表
 */
async function fetchGeminiModels(config: any, preset: any): Promise<string[]> {
  if (!config.apiKey) {
    throw new Error('Gemini API Key 未配置')
  }
  
  // Gemini 预设模型列表（API 不提供列表端点）
  return [
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ]
}

/**
 * 测试 AI 服务连接和配置
 */
export async function testAIConnection(config: any): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  const preset = AI_PROVIDER_PRESETS[config.provider as AIProvider]
  
  if (!preset) {
    return {
      success: false,
      message: `不支持的 AI 提供商: ${config.provider}`
    }
  }
  
  // 检查必需的配置
  if (preset.requiresKey && !config.apiKey) {
    return {
      success: false,
      message: `${preset.name} 需要配置 API Key`
    }
  }
  
  try {
    // 尝试获取模型列表来测试连接
    const models = await fetchAvailableModels(config)
    
    if (models.length === 0) {
      return {
        success: false,
        message: '未找到可用模型',
        details: { provider: config.provider }
      }
    }
    
    return {
      success: true,
      message: `连接成功！找到 ${models.length} 个可用模型`,
      details: {
        provider: config.provider,
        modelCount: models.length,
        models: models.slice(0, 5) // 只返回前5个作为示例
      }
    }
  } catch (error) {
    console.error(`测试 ${preset.name} 连接失败:`, error)
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '连接测试失败',
      details: {
        provider: config.provider,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

/**
 * 测试翻译功能
 */
export async function testTranslation(config: any): Promise<{
  success: boolean
  message: string
  translatedText?: string
  duration?: number
}> {
  const testText = 'Hello, world!'
  const targetLang = 'zh-CN'
  
  const startTime = Date.now()
  
  try {
    const result = await translateWithAI(testText, 'en', targetLang, { ai: config })
    const duration = Date.now() - startTime
    
    if (!result || result === testText) {
      return {
        success: false,
        message: '翻译失败或返回原文',
        duration
      }
    }
    
    return {
      success: true,
      message: '翻译测试成功',
      translatedText: result,
      duration
    }
  } catch (error) {
    const duration = Date.now() - startTime
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '翻译测试失败',
      duration
    }
  }
}

export default translateWithAI