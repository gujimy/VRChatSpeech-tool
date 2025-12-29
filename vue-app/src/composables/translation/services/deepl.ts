/**
 * DeepL 翻译服务
 * 需要 API Key
 */

import type { TranslateFunction, ServiceConfig } from '../types'
import { DEEPL_LANGUAGE_MAP, getBaseLangCode } from '../constants'

export const translateWithDeepL: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  if (!config?.deepl?.apiKey) {
    throw new Error('DeepL API Key 未配置')
  }

  const fromLang = DEEPL_LANGUAGE_MAP[sourceLang] || getBaseLangCode(sourceLang).toUpperCase()
  const toLang = DEEPL_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang).toUpperCase()
  
  // 检测是否为免费 API Key（以 :fx 结尾）
  const isFreeApi = config.deepl.apiKey.endsWith(':fx')
  const baseUrl = isFreeApi
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate'
  
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `DeepL-Auth-Key ${config.deepl.apiKey}`
      },
      body: JSON.stringify({
        text: [text],
        source_lang: fromLang,
        target_lang: toLang
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      return result.translations?.[0]?.text || text
    } else {
      throw new Error(`DeepL 翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('DeepL 翻译失败:', error)
    throw error
  }
}

export default translateWithDeepL