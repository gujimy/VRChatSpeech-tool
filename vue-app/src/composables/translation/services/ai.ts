/**
 * 统一的 AI 翻译服务
 * 使用策略模式支持多个 AI 提供商
 */

import type { TranslateFunction, ServiceConfig, AITranslationConfig } from '../types'
import { AI_PROVIDER_PRESETS } from '../constants'
import { StrategyFactory } from '../strategies'
import { CorsError, ConfigurationError } from '../errors'

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
    throw new ConfigurationError('AI 翻译配置未设置')
  }
  
  // 使用策略模式获取对应的提供商策略
  const strategy = StrategyFactory.getStrategy(aiConfig.provider)
  return await strategy.translate(text, targetLang, aiConfig)
}

/**
 * 获取可用模型列表
 */
export async function fetchAvailableModels(config: AITranslationConfig): Promise<string[]> {
  const preset = AI_PROVIDER_PRESETS[config.provider]
  
  if (!preset) {
    throw new ConfigurationError(`不支持的 AI 提供商: ${config.provider}`, 'provider')
  }
  
  try {
    const strategy = StrategyFactory.getStrategy(config.provider)
    const models = await strategy.getModels(config)
    
    // 如果模型列表为空且用户配置了模型，返回配置的模型
    if (models.length === 0 && config.model) {
      return [config.model]
    }
    
    return models
  } catch (error) {
    // 处理 CORS 错误
    if (error instanceof CorsError) {
      console.warn(`⚠️ 浏览器 CORS 限制：无法直接获取 ${config.baseURL || preset.baseURL} 的模型列表`)
      console.warn(`💡 解决方案：`)
      console.warn(`  1. 手动在下方输入模型名称`)
      console.warn(`  2. 使用桌面版应用（无 CORS 限制）`)
      console.warn(`  3. 配置 CORS 代理服务器`)
      
      // 如果用户已配置模型，返回它；否则返回空数组
      if (config.model) {
        return [config.model]
      }
      return []
    }
    
    console.error(`获取 ${preset.name} 模型列表失败:`, error)
    
    // 对于其他错误，如果用户配置了模型，返回配置的模型
    if (config.model) {
      console.warn(`无法获取模型列表，使用配置的模型: ${config.model}`)
      return [config.model]
    }
    
    throw error
  }
}

/**
 * 测试 AI 服务连接和配置
 */
export async function testAIConnection(config: AITranslationConfig): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  const preset = AI_PROVIDER_PRESETS[config.provider]
  
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
export async function testTranslation(config: AITranslationConfig): Promise<{
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