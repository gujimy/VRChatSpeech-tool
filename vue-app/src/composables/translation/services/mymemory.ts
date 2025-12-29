/**
 * MyMemory 翻译服务
 * 免费，无需 API Key，有请求限制
 */

import type { TranslateFunction } from '../types'
import { GOOGLE_LANGUAGE_MAP, getBaseLangCode } from '../constants'

export const translateWithMyMemory: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  const fromLang = GOOGLE_LANGUAGE_MAP[sourceLang] || getBaseLangCode(sourceLang)
  const toLang = GOOGLE_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang)
  
  const params = new URLSearchParams({
    q: text,
    langpair: `${fromLang}|${toLang}`
  })
  
  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?${params}`, {
      method: 'GET'
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.responseStatus === 200 || result.responseStatus === '200') {
        return result.responseData?.translatedText || text
      } else {
        throw new Error(`MyMemory 翻译失败: ${result.responseDetails || '未知错误'}`)
      }
    } else {
      throw new Error(`MyMemory 翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('MyMemory 翻译失败:', error)
    throw error
  }
}

export default translateWithMyMemory