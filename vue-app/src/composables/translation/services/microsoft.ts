/**
 * 微软翻译服务
 * 免费，通过 Edge 获取 Token
 */

import type { TranslateFunction } from '../types'
import { MICROSOFT_LANGUAGE_MAP, getBaseLangCode } from '../constants'

// 微软翻译 Token 缓存
let microsoftToken: string | null = null
let microsoftTokenExpiry = 0

/**
 * 获取微软翻译 Token（通过 Edge 免费接口）
 */
async function getMicrosoftToken(): Promise<string> {
  const now = Date.now()
  if (microsoftToken && now < microsoftTokenExpiry) {
    return microsoftToken
  }
  
  try {
    const response = await fetch('https://edge.microsoft.com/translate/auth')
    if (response.ok) {
      microsoftToken = await response.text()
      // Token 有效期约 10 分钟，我们设置 8 分钟刷新
      microsoftTokenExpiry = now + 8 * 60 * 1000
      return microsoftToken
    }
    throw new Error('获取 Token 失败')
  } catch (error) {
    console.error('获取微软翻译 Token 失败:', error)
    throw error
  }
}

export const translateWithMicrosoft: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  const fromLang = MICROSOFT_LANGUAGE_MAP[sourceLang] || ''
  const toLang = MICROSOFT_LANGUAGE_MAP[targetLang] || getBaseLangCode(targetLang)
  
  try {
    const token = await getMicrosoftToken()
    
    const response = await fetch(
      `https://api-edge.cognitive.microsofttranslator.com/translate?from=${fromLang}&to=${toLang}&api-version=3.0&includeSentenceLength=true&textType=html`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify([{ Text: text }])
      }
    )
    
    if (response.ok) {
      const result = await response.json()
      return result[0]?.translations?.[0]?.text || text
    } else {
      throw new Error(`微软翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('微软翻译失败:', error)
    throw error
  }
}

export default translateWithMicrosoft