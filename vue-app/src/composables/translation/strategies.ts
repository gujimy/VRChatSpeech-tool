/**
 * AI 提供商策略模式
 * 为每个 AI 提供商定义统一的接口和实现
 */

import type { AITranslationConfig } from './types'
import { CorsError, APIResponseError, ConfigurationError } from './errors'
import { AI_LANGUAGE_NAMES, DEFAULT_AI_SYSTEM_PROMPT, DEFAULT_AI_USER_PROMPT, AI_PROVIDER_PRESETS } from './constants'

/**
 * AI 提供商策略接口
 */
export interface IProviderStrategy {
  /**
   * 翻译文本
   */
  translate(text: string, targetLang: string, config: AITranslationConfig): Promise<string>
  
  /**
   * 获取可用模型列表
   */
  getModels(config: AITranslationConfig): Promise<string[]>
}

/**
 * OpenAI 格式请求/响应接口
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
 * OpenAI 兼容策略基类
 * 支持: OpenAI、Ollama、LM Studio、自定义端点
 */
export class OpenAICompatibleStrategy implements IProviderStrategy {
  protected readonly providerName: string

  constructor(providerName: string = 'OpenAI Compatible') {
    this.providerName = providerName
  }

  async translate(text: string, targetLang: string, config: AITranslationConfig): Promise<string> {
    const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
    const preset = AI_PROVIDER_PRESETS[config.provider]
    const baseURL = config.baseURL || preset.baseURL

    // 验证自定义提供商必须配置模型
    if (config.provider === 'custom' && !config.model) {
      throw new ConfigurationError('使用自定义提供商时，必须在设置中指定模型名称', 'model')
    }

    const model = config.model || preset.defaultModel
    
    // 构建 URL
    const normalizedBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const url = normalizedBaseURL.endsWith('/chat/completions')
      ? normalizedBaseURL
      : `${normalizedBaseURL}/chat/completions`

    // 构建提示词
    const systemPrompt = config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT
    const userPrompt = (config.userPrompt || DEFAULT_AI_USER_PROMPT)
      .replace('{{to}}', targetLanguage)
      .replace('{{origin}}', text)

    // 构建请求体
    const requestBody: OpenAIRequest = {
      model,
      temperature: config.temperature ?? 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }

    if (config.maxTokens) {
      requestBody.max_tokens = config.maxTokens
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // 本地模型（Ollama、LM Studio）通常不需要 API Key
    if (config.apiKey && !['ollama', 'lm-studio'].includes(config.provider)) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIResponseError(
          `${this.providerName} API 请求失败`,
          response.status,
          response.statusText,
          errorText
        )
      }

      const data: OpenAIResponse = await response.json()

      if (!data.choices || data.choices.length === 0) {
        throw new APIResponseError(`${this.providerName} API 返回结果为空`)
      }

      const translatedText = data.choices[0].message.content.trim()

      if (!translatedText) {
        throw new APIResponseError(`${this.providerName} API 返回了空翻译结果`)
      }

      return translatedText
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw error
      }
      console.error(`${this.providerName} 翻译失败:`, error)
      throw new Error(`${this.providerName} 翻译服务出错`)
    }
  }

  async getModels(config: AITranslationConfig): Promise<string[]> {
    const preset = AI_PROVIDER_PRESETS[config.provider]
    const baseURL = config.baseURL || preset.baseURL
    const url = baseURL.endsWith('/models') ? baseURL : `${baseURL}/models`

    const headers: Record<string, string> = {}
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    try {
      const response = await fetch(url, { headers })

      if (!response.ok) {
        const errorText = await response.text()
        throw new APIResponseError(
          '获取模型列表失败',
          response.status,
          response.statusText,
          errorText
        )
      }

      const data = await response.json()

      if (!data.data || !Array.isArray(data.data)) {
        throw new APIResponseError(`模型列表格式错误: 期望 { data: [...] }`)
      }

      return data.data
        .map((model: any) => model.id)
        .filter((id: string) => id && typeof id === 'string')
        .sort()
    } catch (error) {
      // 捕获 CORS 错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new CorsError(
          '浏览器环境下无法直接调用此 API，请手动输入模型名称或使用桌面版',
          url,
          config.provider
        )
      }
      throw error
    }
  }
}

/**
 * Ollama 策略
 */
export class OllamaStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super('Ollama')
  }

  async getModels(config: AITranslationConfig): Promise<string[]> {
    const preset = AI_PROVIDER_PRESETS[config.provider]
    const baseURL = config.baseURL || preset.baseURL
    // Ollama 使用 /api/tags 端点
    const url = baseURL.replace('/v1', '/api/tags')

    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new APIResponseError('获取 Ollama 模型列表失败', response.status)
      }

      const data = await response.json()

      if (!data.models || !Array.isArray(data.models)) {
        return []
      }

      return data.models
        .map((model: any) => model.name)
        .filter((name: string) => name && typeof name === 'string')
        .sort()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new CorsError('无法连接到 Ollama 服务', url, 'ollama')
      }
      throw error
    }
  }
}

/**
 * Gemini 格式接口
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
 * Gemini 策略
 */
export class GeminiStrategy implements IProviderStrategy {
  async translate(text: string, targetLang: string, config: AITranslationConfig): Promise<string> {
    if (!config.apiKey) {
      throw new ConfigurationError('Gemini API Key 未配置', 'apiKey')
    }

    const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
    const preset = AI_PROVIDER_PRESETS.gemini
    const model = config.model || preset.defaultModel

    const userPrompt = (config.userPrompt || DEFAULT_AI_USER_PROMPT)
      .replace('{{to}}', targetLanguage)
      .replace('{{origin}}', text)

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
        const errorText = await response.text()
        throw new APIResponseError(
          'Gemini API 请求失败',
          response.status,
          response.statusText,
          errorText
        )
      }

      const data: GeminiResponse = await response.json()

      if (!data.candidates || data.candidates.length === 0) {
        throw new APIResponseError('Gemini API 返回结果为空')
      }

      const translatedText = data.candidates[0].content.parts[0].text.trim()

      if (!translatedText) {
        return text // 返回原文本
      }

      return translatedText
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw error
      }
      console.error('Gemini 翻译失败:', error)
      throw new Error('Gemini 翻译服务出错')
    }
  }

  async getModels(config: AITranslationConfig): Promise<string[]> {
    // Gemini 预设模型列表（API 不提供列表端点）
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b'
    ]
  }
}

/**
 * Claude 格式接口
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
 * Claude 策略
 */
export class ClaudeStrategy implements IProviderStrategy {
  async translate(text: string, targetLang: string, config: AITranslationConfig): Promise<string> {
    if (!config.apiKey) {
      throw new ConfigurationError('Claude API Key 未配置', 'apiKey')
    }

    const targetLanguage = AI_LANGUAGE_NAMES[targetLang] || targetLang
    const preset = AI_PROVIDER_PRESETS.claude
    const model = config.model || preset.defaultModel
    const baseURL = config.baseURL || preset.baseURL

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
        const errorText = await response.text()
        throw new APIResponseError(
          'Claude API 请求失败',
          response.status,
          response.statusText,
          errorText
        )
      }

      const data: ClaudeResponse = await response.json()

      if (!data.content || data.content.length === 0) {
        throw new APIResponseError('Claude API 返回结果为空')
      }

      const translatedText = data.content[0].text.trim()

      if (!translatedText) {
        return text // 返回原文本
      }

      return translatedText
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw error
      }
      console.error('Claude 翻译失败:', error)
      throw new Error('Claude 翻译服务出错')
    }
  }

  async getModels(config: AITranslationConfig): Promise<string[]> {
    // Claude 预设模型列表
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ]
  }
}

/**
 * 策略工厂
 * 根据提供商类型返回对应的策略实例
 */
export class StrategyFactory {
  private static strategies: Map<string, IProviderStrategy> = new Map([
    ['openai', new OpenAICompatibleStrategy('OpenAI')],
    ['custom', new OpenAICompatibleStrategy('OpenAI Compatible')],
    ['ollama', new OllamaStrategy()],
    ['lm-studio', new OpenAICompatibleStrategy('LM Studio')],
    ['gemini', new GeminiStrategy()],
    ['claude', new ClaudeStrategy()]
  ])

  static getStrategy(provider: string): IProviderStrategy {
    const strategy = this.strategies.get(provider)
    if (!strategy) {
      throw new ConfigurationError(`不支持的 AI 提供商: ${provider}`, 'provider')
    }
    return strategy
  }
}