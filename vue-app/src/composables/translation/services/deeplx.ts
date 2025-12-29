/**
 * DeepLX 翻译服务
 * 自建 DeepL API 代理，需要配置服务器地址
 */

import type { TranslateFunction, ServiceConfig } from '../types'
import { DEEPL_LANGUAGE_MAP, getBaseLangCode } from '../constants'

export const translateWithDeepLX: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  if (!config?.deeplx?.url) {
    throw new Error('DeepLX 服务器地址未配置')
  }

  const fromLang = DEEPL_LANGUAGE_MAP[sourceLang] || getBaseLangCode(sourceLang).toUpperCase()
  const toLang = DEEPL_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang).toUpperCase()
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // 如果配置了 token，添加到请求头
    if (config.deeplx.token) {
      headers['Authorization'] = `Bearer ${config.deeplx.token}`
    }
    
    const response = await fetch(`${config.deeplx.url}/translate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text,
        source_lang: fromLang,
        target_lang: toLang
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.data || result.translations?.[0]?.text || text
    } else {
      throw new Error(`DeepLX 翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('DeepLX 翻译失败:', error)
    throw error
  }
}

export default translateWithDeepLX