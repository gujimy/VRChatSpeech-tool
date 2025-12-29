/**
 * Chrome 本地翻译服务
 * 使用浏览器内置的翻译 API（实验性功能）
 */

import type { TranslateFunction } from '../types'
import { GOOGLE_LANGUAGE_MAP, getBaseLangCode } from '../constants'

// Chrome 特定的语言代码映射（覆盖通用映射）
const chromeLanguageMap: Record<string, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-TW'
}

// Chrome Translation API 类型声明（基于 Chrome 138+ Translator API）
interface CreateTranslatorOptions {
  sourceLanguage: string
  targetLanguage: string
  monitor?: (monitor: TranslationMonitor) => void
}

/**
 * 翻译监控器接口
 * 用于监听翻译模型下载进度
 */
interface TranslationMonitor {
  addEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void
  removeEventListener(type: 'downloadprogress', listener: (event: DownloadProgressEvent) => void): void
}

/**
 * 下载进度事件接口
 */
interface DownloadProgressEvent {
  loaded: number
  total: number
}

interface Translator {
  translate(text: string): Promise<string>
  translateStreaming?(text: string): AsyncIterable<string>
  ready?: Promise<void>
}

interface TranslatorStatic {
  availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(options: CreateTranslatorOptions): Promise<Translator>
}

declare global {
  interface Window {
    Translator?: TranslatorStatic
  }
  const Translator: TranslatorStatic | undefined
}

/**
 * 检查 Chrome 翻译 API 是否可用
 * Chrome 138+ 使用 Translator API，而不是旧的 translation API
 */
export async function isChromeTranslationAvailable(): Promise<boolean> {
  try {
    // 根据文档，应该检查 window.Translator 或 self.Translator
    if (!('Translator' in window) && !('Translator' in self)) {
      console.warn('Chrome 翻译 API 不可用：需要 Chrome 138+ 版本')
      return false
    }
    
    // 测试是否可以翻译（检查英文到中文）
    const Translator = window.Translator || self.Translator
    if (!Translator) {
      return false
    }
    
    const availability = await Translator.availability({
      sourceLanguage: 'en',
      targetLanguage: 'zh'
    })
    
    // readily: 模型已准备好，可立即使用
    // after-download: 模型可下载后使用
    // downloadable: 模型可以下载（为保护隐私，在创建翻译器前显示此状态）
    console.log(`Chrome 翻译 API 可用性: ${availability}`)
    return availability === 'readily' || availability === 'after-download' || availability === 'downloadable'
  } catch (error) {
    console.error('检查 Chrome 翻译 API 可用性失败:', error)
    return false
  }
}

export const translateWithChrome: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  // 检查 API 是否可用
  const Translator = window.Translator || self.Translator
  if (!Translator) {
    throw new Error('Chrome 翻译 API 不可用。需要 Chrome 138+ 版本，并且必须启用该功能。')
  }

  const fromLang = chromeLanguageMap[sourceLang] || GOOGLE_LANGUAGE_MAP[sourceLang] || getBaseLangCode(sourceLang)
  const toLang = chromeLanguageMap[targetLang] || GOOGLE_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang)
  
  try {
    // 检查语言对是否支持
    const availability = await Translator.availability({
      sourceLanguage: fromLang,
      targetLanguage: toLang
    })
    
    console.log(`翻译可用性 (${fromLang} → ${toLang}): ${availability}`)
    
    if (availability === 'no') {
      throw new Error(`不支持从 ${fromLang} 翻译到 ${toLang}`)
    }
    
    // 创建翻译器（带下载进度监听和超时处理）
    let downloadProgress = 0
    const createTranslatorPromise = Translator.create({
      sourceLanguage: fromLang,
      targetLanguage: toLang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          downloadProgress = e.loaded
          const percentage = Math.round(e.loaded * 100)
          console.log(`📥 下载翻译模型 (${fromLang} → ${toLang}): ${percentage}%`)
        })
      }
    })
    
    // 添加超时处理（60秒）
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`翻译模型下载超时（进度: ${Math.round(downloadProgress * 100)}%）`))
      }, 60000)
    })
    
    const translator = await Promise.race([createTranslatorPromise, timeoutPromise])
    
    // 等待模型准备就绪（如果有 ready promise）
    if (translator.ready) {
      await translator.ready
    }
    
    // 执行翻译
    const result = await translator.translate(text)
    
    if (!result || result.trim() === '') {
      console.warn('翻译结果为空，返回原文本')
      return text
    }
    
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Chrome 翻译失败:', {
      from: fromLang,
      to: toLang,
      error: errorMessage
    })
    
    // 提供更友好的错误消息
    if (errorMessage.includes('超时')) {
      throw new Error(`翻译模型下载超时。请检查网络连接或稍后重试。`)
    } else if (errorMessage.includes('不支持')) {
      throw new Error(`该语言对 (${fromLang} → ${toLang}) 暂不支持离线翻译`)
    } else {
      throw new Error(`Chrome 翻译失败: ${errorMessage}`)
    }
  }
}

export default translateWithChrome