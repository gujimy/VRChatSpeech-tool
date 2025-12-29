/**
 * 翻译服务统一导出
 */

import type { TranslateFunction, ServiceType, ServiceOption } from '../types'
import { ServiceCategory } from '../types'

// 导入所有翻译服务
import translateWithGoogle from './google'
import translateWithMicrosoft from './microsoft'
import translateWithDeepL from './deepl'
import translateWithDeepLX from './deeplx'
import translateWithMyMemory from './mymemory'
import translateWithXiaoniu from './xiaoniu'
import translateWithYoudao from './youdao'
import translateWithTencent from './tencent'
import translateWithChrome, { isChromeTranslationAvailable } from './chrome'

// 导入 AI 翻译服务
import { translateWithAI } from './ai'

/**
 * 翻译服务映射表
 */
export const translationServices: Record<ServiceType, TranslateFunction> = {
  // 机器翻译
  google: translateWithGoogle,
  microsoft: translateWithMicrosoft,
  deepl: translateWithDeepL,
  deeplx: translateWithDeepLX,
  mymemory: translateWithMyMemory,
  xiaoniu: translateWithXiaoniu,
  youdao: translateWithYoudao,
  tencent: translateWithTencent,
  chrome: translateWithChrome,
  
  // AI 翻译（统一接口）
  ai: translateWithAI
}

/**
 * 翻译服务选项列表
 */
export const serviceOptions: ServiceOption[] = [
  {
    title: 'Google 翻译',
    value: 'google',
    icon: '🌐',
    category: ServiceCategory.MACHINE,
    free: true,
    local: false
  },
  {
    title: '微软翻译',
    value: 'microsoft',
    icon: '🔷',
    category: ServiceCategory.MACHINE,
    free: true,
    local: false
  },
  {
    title: 'DeepL',
    value: 'deepl',
    icon: '🔵',
    category: ServiceCategory.MACHINE,
    free: false,
    requiresToken: true,
    local: false
  },
  {
    title: 'DeepLX',
    value: 'deeplx',
    icon: '🔷',
    category: ServiceCategory.MACHINE,
    free: true,
    requiresConfig: true,
    local: false,
    experimental: true
  },
  {
    title: 'MyMemory',
    value: 'mymemory',
    icon: '💾',
    category: ServiceCategory.MACHINE,
    free: true,
    local: false
  },
  {
    title: '小牛翻译',
    value: 'xiaoniu',
    icon: '🐮',
    category: ServiceCategory.MACHINE,
    free: false,
    requiresToken: true,
    local: false
  },
  {
    title: '有道翻译',
    value: 'youdao',
    icon: '📖',
    category: ServiceCategory.MACHINE,
    free: false,
    requiresConfig: true,
    local: false
  },
  {
    title: '腾讯云翻译',
    value: 'tencent',
    icon: '🐧',
    category: ServiceCategory.MACHINE,
    free: false,
    requiresConfig: true,
    local: false
  },
  {
    title: 'Chrome 本地翻译',
    value: 'chrome',
    icon: '🌐',
    category: ServiceCategory.MACHINE,
    free: true,
    local: true,
    experimental: true
  },
  // AI 翻译（统一接口）
  {
    title: 'AI 翻译',
    value: 'ai',
    icon: '🤖',
    category: ServiceCategory.AI,
    free: true,
    requiresConfig: true,
    experimental: false
  }
]

/**
 * 获取翻译服务
 */
export function getTranslationService(serviceType: ServiceType): TranslateFunction {
  const service = translationServices[serviceType]
  if (!service) {
    throw new Error(`未知的翻译服务: ${serviceType}`)
  }
  return service
}

/**
 * 检查服务可用性
 */
export async function checkServiceAvailability(serviceType: ServiceType): Promise<boolean> {
  switch (serviceType) {
    case 'chrome':
      return await isChromeTranslationAvailable()
    default:
      return true
  }
}

/**
 * 按分类获取服务选项
 */
export function getServicesByCategory(category: ServiceCategory): ServiceOption[] {
  return serviceOptions.filter(option => option.category === category)
}

/**
 * 获取免费服务
 */
export function getFreeServices(): ServiceOption[] {
  return serviceOptions.filter(option => option.free)
}

/**
 * 获取需要配置的服务
 */
export function getConfigurableServices(): ServiceOption[] {
  return serviceOptions.filter(option => option.requiresToken || option.requiresConfig)
}

// 导出所有服务
export {
  translateWithGoogle,
  translateWithMicrosoft,
  translateWithDeepL,
  translateWithDeepLX,
  translateWithMyMemory,
  translateWithXiaoniu,
  translateWithYoudao,
  translateWithTencent,
  translateWithChrome,
  isChromeTranslationAvailable
}

// 导出 AI 翻译服务
export { translateWithAI } from './ai'