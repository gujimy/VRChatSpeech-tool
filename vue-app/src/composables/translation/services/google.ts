/**
 * Google 翻译服务
 * 免费，无需 API Key
 */

import type { TranslateFunction } from '../types'
import { GOOGLE_LANGUAGE_MAP, getBaseLangCode } from '../constants'

export const translateWithGoogle: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  const fromLang = GOOGLE_LANGUAGE_MAP[sourceLang] || getBaseLangCode(sourceLang) || 'auto'
  const toLang = GOOGLE_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang)
  
  const params = new URLSearchParams({
    client: 'gtx',
    sl: fromLang,
    tl: toLang,
    dt: 't',
    strip: '1',
    nonced: '1',
    q: text
  })
  
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
      method: 'GET'
    })
    
    if (response.ok) {
      const result = await response.json()
      let sentence = ''
      if (result[0]) {
        result[0].forEach((e: any) => {
          if (e[0]) sentence += e[0]
        })
      }
      return sentence || text
    } else {
      throw new Error(`Google 翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('Google 翻译失败:', error)
    throw error
  }
}

export default translateWithGoogle