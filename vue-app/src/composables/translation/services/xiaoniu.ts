/**
 * 小牛翻译服务
 * 需要 API Key
 */

import type { TranslateFunction, ServiceConfig } from '../types'

// 语言代码映射
const languageMap: Record<string, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'cht',
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

export const translateWithXiaoniu: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  if (!config?.xiaoniu?.apiKey) {
    throw new Error('小牛翻译 API Key 未配置')
  }

  const fromLang = languageMap[sourceLang] || 'auto'
  const toLang = languageMap[targetLang] || targetLang.split('-')[0]
  
  // 生成签名（使用浏览器 crypto API）
  const timestamp = Date.now().toString()
  const signStr = config.xiaoniu.apiKey + text + timestamp
  
  // 使用 SubtleCrypto API 生成 MD5
  const encoder = new TextEncoder()
  const data = encoder.encode(signStr)
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => {
    // 如果浏览器不支持 MD5，使用 SHA-256 作为替代
    return crypto.subtle.digest('SHA-256', data)
  })
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  try {
    const response = await fetch('https://api.niutrans.com/NiuTransServer/translation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        src_text: text,
        from: fromLang,
        to: toLang,
        apikey: config.xiaoniu.apiKey,
        time: timestamp,
        sign
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.tgt_text) {
        return result.tgt_text
      } else if (result.error_code) {
        throw new Error(`小牛翻译失败: ${result.error_msg || result.error_code}`)
      } else {
        throw new Error('小牛翻译返回格式错误')
      }
    } else {
      throw new Error(`小牛翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('小牛翻译失败:', error)
    throw error
  }
}

export default translateWithXiaoniu