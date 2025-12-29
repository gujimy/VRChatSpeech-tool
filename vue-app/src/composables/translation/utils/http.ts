/**
 * HTTP 请求工具函数
 * 为翻译服务提供统一的网络请求处理
 */

/**
 * HTTP 请求配置选项
 */
export interface HttpRequestOptions {
  /** 请求方法 */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 请求头 */
  headers?: Record<string, string>
  /** 请求体 */
  body?: string | FormData | URLSearchParams
  /** 超时时间（毫秒），默认 30000ms */
  timeout?: number
  /** 重试次数，默认 0（不重试） */
  retries?: number
  /** 重试延迟（毫秒），默认 1000ms */
  retryDelay?: number
  /** 是否在控制台记录请求详情，默认 false */
  debug?: boolean
}

/**
 * HTTP 请求错误
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public url?: string,
    public responseBody?: string
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 执行带超时的 fetch 请求
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(`请求超时 (${timeout}ms)`, undefined, undefined, url)
    }
    throw error
  }
}

/**
 * 统一的 HTTP 请求函数
 * 
 * @param url - 请求 URL
 * @param options - 请求配置选项
 * @returns Promise<Response>
 * 
 * @example
 * ```typescript
 * // GET 请求
 * const response = await httpRequest('https://api.example.com/data', {
 *   method: 'GET',
 *   timeout: 5000
 * })
 * const data = await response.json()
 * 
 * // POST 请求
 * const response = await httpRequest('https://api.example.com/translate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ text: 'Hello' }),
 *   retries: 2
 * })
 * ```
 */
export async function httpRequest(
  url: string,
  options: HttpRequestOptions = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    debug = false
  } = options

  let lastError: Error | null = null
  
  // 尝试请求（包括重试）
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (debug) {
        console.log(`[HTTP] ${method} ${url}`, {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          headers,
          bodyLength: body ? (typeof body === 'string' ? body.length : 'N/A') : 0
        })
      }

      const response = await fetchWithTimeout(
        url,
        {
          method,
          headers,
          body
        },
        timeout
      )

      if (debug) {
        console.log(`[HTTP] Response ${response.status} ${response.statusText}`, {
          url,
          attempt: attempt + 1
        })
      }

      // 如果响应成功，直接返回
      if (response.ok) {
        return response
      }

      // 如果是客户端错误（4xx），不重试
      if (response.status >= 400 && response.status < 500) {
        const responseBody = await response.text()
        throw new HttpError(
          `请求失败: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText,
          url,
          responseBody
        )
      }

      // 服务器错误（5xx）或其他错误，可以重试
      const responseBody = await response.text()
      lastError = new HttpError(
        `服务器错误: ${response.status} ${response.statusText}`,
        response.status,
        response.statusText,
        url,
        responseBody
      )

      if (debug) {
        console.warn(`[HTTP] 请求失败，准备重试`, {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          error: lastError.message
        })
      }

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (debug) {
        console.error(`[HTTP] 请求异常`, {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          error: lastError.message
        })
      }

      // 如果是 HttpError 且是客户端错误，不重试
      if (error instanceof HttpError && error.status && error.status >= 400 && error.status < 500) {
        throw error
      }
    }

    // 如果还有重试机会，等待后重试
    if (attempt < retries) {
      await delay(retryDelay)
    }
  }

  // 所有重试都失败，抛出最后一个错误
  throw lastError || new Error('请求失败')
}

/**
 * 发送 JSON 请求的便捷函数
 * 
 * @param url - 请求 URL
 * @param data - 要发送的 JSON 数据
 * @param options - 其他请求选项
 * @returns Promise<any> - 解析后的 JSON 响应
 */
export async function httpPostJson<T = any>(
  url: string,
  data: any,
  options: Omit<HttpRequestOptions, 'method' | 'body' | 'headers'> & { headers?: Record<string, string> } = {}
): Promise<T> {
  const response = await httpRequest(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  })

  return await response.json()
}

/**
 * 发送 GET 请求并解析 JSON 的便捷函数
 * 
 * @param url - 请求 URL
 * @param options - 请求选项
 * @returns Promise<any> - 解析后的 JSON 响应
 */
export async function httpGetJson<T = any>(
  url: string,
  options: Omit<HttpRequestOptions, 'method'> = {}
): Promise<T> {
  const response = await httpRequest(url, {
    ...options,
    method: 'GET'
  })

  return await response.json()
}

/**
 * 构建 URL 查询参数
 * 
 * @param params - 参数对象
 * @returns URLSearchParams
 */
export function buildQueryParams(params: Record<string, string | number | boolean>): URLSearchParams {
  const searchParams = new URLSearchParams()
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  }
  
  return searchParams
}