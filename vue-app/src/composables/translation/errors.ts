/**
 * 翻译服务自定义错误类
 */

/**
 * CORS 错误
 * 当浏览器由于 CORS 策略阻止 API 请求时抛出
 */
export class CorsError extends Error {
  constructor(message: string, public readonly url?: string, public readonly provider?: string) {
    super(message);
    this.name = 'CorsError';
    Object.setPrototypeOf(this, CorsError.prototype);
  }
}

/**
 * API 配置错误
 * 当 API 配置不完整或无效时抛出
 */
export class ConfigurationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * API 响应错误
 * 当 API 返回错误响应时抛出
 */
export class APIResponseError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly statusText?: string,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'APIResponseError';
    Object.setPrototypeOf(this, APIResponseError.prototype);
  }
}