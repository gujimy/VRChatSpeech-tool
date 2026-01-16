/**
 * 翻译服务公共常量
 * 统一管理语言代码映射和其他常量
 */

/**
 * 通用语言代码映射
 * 将标准语言代码映射到各个翻译服务的特定格式
 */
export const LANGUAGE_CODES = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en-US': 'en',
  'en': 'en',
  'ja-JP': 'ja',
  'ja': 'ja',
  'ko-KR': 'ko',
  'ko': 'ko',
  'es-ES': 'es',
  'es': 'es',
  'fr-FR': 'fr',
  'fr': 'fr',
  'de-DE': 'de',
  'de': 'de',
  'ru-RU': 'ru',
  'ru': 'ru',
  'pt-BR': 'pt',
  'pt': 'pt',
  'auto': 'auto'
} as const

/**
 * Google 翻译语言代码映射
 */
export const GOOGLE_LANGUAGE_MAP: Record<string, string> = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'en-US': 'en',
  'en': 'en',
  'ja-JP': 'ja',
  'ja': 'ja',
  'ko-KR': 'ko',
  'ko': 'ko',
  'es-ES': 'es',
  'es': 'es',
  'fr-FR': 'fr',
  'fr': 'fr',
  'de-DE': 'de',
  'de': 'de',
  'ru-RU': 'ru',
  'ru': 'ru',
  'pt-BR': 'pt',
  'pt': 'pt',
  'auto': 'auto'
}

/**
 * 微软翻译语言代码映射
 */
export const MICROSOFT_LANGUAGE_MAP: Record<string, string> = {
  'zh-CN': 'zh-Hans',
  'zh-TW': 'zh-Hant',
  'en-US': 'en',
  'en': 'en',
  'ja-JP': 'ja',
  'ja': 'ja',
  'ko-KR': 'ko',
  'ko': 'ko',
  'es-ES': 'es',
  'es': 'es',
  'fr-FR': 'fr',
  'fr': 'fr',
  'de-DE': 'de',
  'de': 'de',
  'ru-RU': 'ru',
  'ru': 'ru',
  'pt-BR': 'pt',
  'pt': 'pt'
}

/**
 * DeepL 翻译语言代码映射
 */
export const DEEPL_LANGUAGE_MAP: Record<string, string> = {
  'zh-CN': 'ZH',
  'zh-TW': 'ZH',
  'en-US': 'EN',
  'en': 'EN',
  'ja-JP': 'JA',
  'ja': 'JA',
  'ko-KR': 'KO',
  'ko': 'KO',
  'es-ES': 'ES',
  'es': 'ES',
  'fr-FR': 'FR',
  'fr': 'FR',
  'de-DE': 'DE',
  'de': 'DE',
  'ru-RU': 'RU',
  'ru': 'RU',
  'pt-BR': 'PT-BR',
  'pt': 'PT-PT'
}

/**
 * AI 翻译服务的语言名称映射
 * 用于生成提示词
 */
export const AI_LANGUAGE_NAMES: Record<string, string> = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  'en-US': 'English',
  'en': 'English',
  'ja-JP': 'Japanese',
  'ja': 'Japanese',
  'ko-KR': 'Korean',
  'ko': 'Korean',
  'es-ES': 'Spanish',
  'es': 'Spanish',
  'fr-FR': 'French',
  'fr': 'French',
  'de-DE': 'German',
  'de': 'German',
  'ru-RU': 'Russian',
  'ru': 'Russian',
  'pt-BR': 'Portuguese',
  'pt': 'Portuguese'
}

/**
 * 获取语言代码的基础部分（去除地区）
 * @param langCode - 完整的语言代码（如 'zh-CN'）
 * @returns 基础语言代码（如 'zh'）
 */
export function getBaseLangCode(langCode: string): string {
  return langCode.split('-')[0]
}

/**
 * 获取指定翻译服务的语言代码
 * @param langCode - 标准语言代码
 * @param service - 翻译服务名称
 * @returns 该服务对应的语言代码
 */
export function getServiceLangCode(
  langCode: string,
  service: 'google' | 'microsoft' | 'deepl' | 'ai'
): string {
  const maps = {
    google: GOOGLE_LANGUAGE_MAP,
    microsoft: MICROSOFT_LANGUAGE_MAP,
    deepl: DEEPL_LANGUAGE_MAP,
    ai: AI_LANGUAGE_NAMES
  }
  
  const map = maps[service]
  return map[langCode] || getBaseLangCode(langCode)
}

/**
 * 默认的 AI 翻译 System Prompt
 */
export const DEFAULT_AI_SYSTEM_PROMPT = 'You are a professional, authentic machine translation engine.'

/**
 * 默认的 AI 翻译 User Prompt 模板
 */
export const DEFAULT_AI_USER_PROMPT = `Translate the following text into {{to}}, If translation is unnecessary (e.g. proper nouns, codes, etc.), return the original text. NO explanations. NO notes:

{{origin}}`

/**
 * 翻译服务配置
 */
export const TRANSLATION_SERVICES = {
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  DEEPL: 'deepl',
  DEEPLX: 'deeplx',
  MYMEMORY: 'mymemory',
  CHROME: 'chrome',
  OPENAI: 'openai',
  GEMINI: 'gemini',
  CLAUDE: 'claude',
  CUSTOM: 'custom'
} as const

/**
 * 翻译服务类型
 */
export type TranslationService = typeof TRANSLATION_SERVICES[keyof typeof TRANSLATION_SERVICES]

/**
 * AI 提供商预设配置
 */
export const AI_PROVIDER_PRESETS = {
  custom: {
    name: 'OpenAI 兼容 API',
    baseURL: '',
    defaultModel: '',
    requiresKey: true,
    icon: 'mdi-cog',
    description: '兼容 OpenAI 的第三方 API (如 NVIDIA, Moonshot)'
  },
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    requiresKey: true,
    icon: 'mdi-robot',
    description: '官方 OpenAI 服务'
  },
  gemini: {
    name: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-1.5-flash',
    requiresKey: true,
    icon: 'mdi-sparkles',
    description: 'Google 的多模态 AI 模型'
  },
  claude: {
    name: 'Anthropic Claude',
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-3-haiku-20240307',
    requiresKey: true,
    icon: 'mdi-brain',
    description: 'Anthropic 的高质量 AI 助手'
  },
  ollama: {
    name: 'Ollama',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: '',
    requiresKey: false,
    icon: 'mdi-llama',
    description: '本地运行，无需 API Key'
  },
  'lm-studio': {
    name: 'LM Studio',
    baseURL: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    requiresKey: false,
    icon: 'mdi-laptop',
    description: '本地运行，无需 API Key'
  }
} as const

/**
 * AI 提供商类型
 */
export type AIProviderType = keyof typeof AI_PROVIDER_PRESETS