/**
 * 腾讯云翻译服务
 * 需要 SecretId 和 SecretKey
 */

import type { TranslateFunction, ServiceConfig } from '../types'

// 语言代码映射
const languageMap: Record<string, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh-TW',
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
 * 生成签名（腾讯云签名算法 v3）
 */
async function generateSignature(
  secretId: string,
  secretKey: string,
  payload: string,
  timestamp: number
): Promise<{ authorization: string; timestamp: string }> {
  const service = 'tmt'
  const host = 'tmt.tencentcloudapi.com'
  const algorithm = 'TC3-HMAC-SHA256'
  const date = new Date(timestamp * 1000).toISOString().split('T')[0]
  
  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST'
  const canonicalUri = '/'
  const canonicalQueryString = ''
  const canonicalHeaders = `content-type:application/json\nhost:${host}\n`
  const signedHeaders = 'content-type;host'
  
  // 计算 payload 的 SHA256
  const encoder = new TextEncoder()
  const payloadBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload))
  const hashedRequestPayload = Array.from(new Uint8Array(payloadBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n')
  
  // 2. 拼接待签名字符串
  const canonicalRequestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest))
  const hashedCanonicalRequest = Array.from(new Uint8Array(canonicalRequestBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = [
    algorithm,
    timestamp.toString(),
    credentialScope,
    hashedCanonicalRequest
  ].join('\n')
  
  // 3. 计算签名（使用 HMAC-SHA256）
  const secretDate = await hmacSha256(encoder.encode(`TC3${secretKey}`), date)
  const secretService = await hmacSha256(secretDate, service)
  const secretSigning = await hmacSha256(secretService, 'tc3_request')
  const signatureBuffer = await hmacSha256(secretSigning, stringToSign)
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  
  // 4. 拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  return {
    authorization,
    timestamp: timestamp.toString()
  }
}

/**
 * HMAC-SHA256 计算
 */
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  // 将 key 转换为 Uint8Array
  const keyArray = key instanceof Uint8Array ? key : new Uint8Array(key)
  // 使用类型断言避免 TypeScript 错误
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyArray as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
}

export const translateWithTencent: TranslateFunction = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  config?: ServiceConfig
): Promise<string> => {
  if (!config?.tencent?.secretId || !config?.tencent?.secretKey) {
    throw new Error('腾讯云翻译配置未完成')
  }

  const fromLang = languageMap[sourceLang] || 'auto'
  const toLang = languageMap[targetLang] || targetLang.split('-')[0]
  
  const timestamp = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({
    SourceText: text,
    Source: fromLang,
    Target: toLang,
    ProjectId: 0
  })
  
  const { authorization, timestamp: timestampStr } = await generateSignature(
    config.tencent.secretId,
    config.tencent.secretKey,
    payload,
    timestamp
  )
  
  try {
    const response = await fetch('https://tmt.tencentcloudapi.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'X-TC-Action': 'TextTranslate',
        'X-TC-Version': '2018-03-21',
        'X-TC-Timestamp': timestampStr,
        'X-TC-Region': 'ap-beijing'
      },
      body: payload
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.Response?.TargetText) {
        return result.Response.TargetText
      } else if (result.Response?.Error) {
        throw new Error(`腾讯云翻译失败: ${result.Response.Error.Message}`)
      } else {
        throw new Error('腾讯云翻译返回格式错误')
      }
    } else {
      throw new Error(`腾讯云翻译失败: ${response.status} ${response.statusText}`)
    }
  } catch (error) {
    console.error('腾讯云翻译失败:', error)
    throw error
  }
}

export default translateWithTencent