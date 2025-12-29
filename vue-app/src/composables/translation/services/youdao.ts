/**
 * 有道翻译服务
 * 需要 App Key 和 App Secret
 */

import type { TranslateFunction, ServiceConfig } from '../types'

// 语言代码映射
const languageMap: Record<string, string> = {
  'zh-CN': 'zh-CHS',
  'zh-TW': 'zh-CHT',
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
 * 生成 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 截取字符串（用于生成 input 参数）
 */
function truncate(text: string): string {
  const len = text.length
  if (len <= 20) return text
  return text.substring(0, 10) + len + text.substring(len - 10, len)
}

/**
 * 生成签名
 */
async function generateSign(
  appKey: string,
  appSecret: string,
  salt: string,
  curtime: string,
  query: string
): Promise<string> {
  const input = truncate(query)
  const signStr = appKey + input + salt + curtime + appSecret
  
  // 使用 SHA-256 生成签名
  const encoder = new TextEncoder()
  const data = encoder.encode(signStr)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const translateWithYoudao: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  if (!config?.youdao?.appKey || !config?.youdao?.appSecret) {
    throw new Error('有道翻译配置未完成')
  }

  const fromLang = languageMap[sourceLang] || 'auto'
  const toLang = languageMap[targetLang] || targetLang.split('-')[0]
  
  const salt = generateUUID()
  const curtime = Math.round(Date.now() / 1000).toString()
  const sign = await generateSign(
    config.youdao.appKey,
    config.youdao.appSecret,
    salt,
    curtime,
    text
  )
  
  const params = new URLSearchParams({
    q: text,
    from: fromLang,
    to: toLang,
    appKey: config.youdao.appKey,
    salt,
    sign,
    signType: 'v3',
    curtime
  })
  
  try {
    const response = await fetch('https://openapi.youdao.com/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.errorCode === '0') {
        return result.translation?.[0] || text
      } else {
        throw new Error(`有道翻译失败: ${result.errorCode}`)
      }
    } else {
      throw new Error(`有道翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('有道翻译失败:', error)
    throw error
  }
}

export default translateWithYoudao