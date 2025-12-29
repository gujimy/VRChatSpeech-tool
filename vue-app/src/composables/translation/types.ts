/**
 * 翻译服务类型定义
 */

// 翻译消息接口
export interface TranslationMessage {
  origin: string    // 原文
  context?: string  // 上下文（可选）
}

// 翻译服务类型
export type ServiceType =
  // 机器翻译
  | 'google'
  | 'microsoft'
  | 'deepl'
  | 'deeplx'
  | 'mymemory'
  | 'xiaoniu'
  | 'youdao'
  | 'tencent'
  | 'chrome'
  // AI 翻译（统一接口）
  | 'ai'

// 服务分类
export enum ServiceCategory {
  MACHINE = 'machine',  // 机器翻译
  AI = 'ai'             // AI 翻译
}

// 翻译服务选项
export interface ServiceOption {
  title: string
  value: ServiceType
  icon: string
  category: ServiceCategory
  free: boolean
  local?: boolean
  experimental?: boolean
  requiresToken?: boolean
  requiresConfig?: boolean
}

// 语言映射
export interface LanguageMapping {
  code: string
  name: string
  google?: string
  microsoft?: string
  deepl?: string
  [key: string]: string | undefined
}

// AI 提供商类型
export type AIProvider =
  | 'openai'      // OpenAI / OpenRouter / DeepSeek 等 OpenAI 兼容
  | 'gemini'      // Google Gemini
  | 'claude'      // Anthropic Claude
  | 'ollama'      // Ollama 本地模型
  | 'lm-studio'   // LM Studio 本地模型
  | 'custom'      // 自定义端点

// AI 翻译配置
export interface AITranslationConfig {
  provider: AIProvider          // 提供商类型
  apiKey?: string               // API Key（可选，本地模型不需要）
  baseURL?: string              // 自定义 API 端点
  model?: string                // 模型名称
  systemPrompt?: string         // 系统提示词
  userPrompt?: string           // 用户提示词
  temperature?: number          // 温度参数（0-2）
  maxTokens?: number            // 最大 Token 数
}

// 服务配置
export interface ServiceConfig {
  // 机器翻译服务
  deepl?: {
    apiKey: string
  }
  deeplx?: {
    url: string
    token?: string
  }
  xiaoniu?: {
    apiKey: string
  }
  youdao?: {
    appKey: string
    appSecret: string
  }
  tencent?: {
    secretId: string
    secretKey: string
  }
  // AI 翻译服务（统一配置）
  ai?: AITranslationConfig
}

// 翻译函数类型
export type TranslateFunction = (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
) => Promise<string>

// 翻译服务接口
export interface TranslationService {
  name: string
  type: ServiceType
  category: ServiceCategory
  translate: TranslateFunction
  checkAvailability?: () => Promise<boolean>
}