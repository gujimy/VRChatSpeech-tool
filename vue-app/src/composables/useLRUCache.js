/**
 * LRU (Least Recently Used) 缓存实现
 * 当缓存达到最大容量时，自动删除最久未使用的项
 */
export class LRUCache {
  /**
   * @param {number} maxSize - 最大缓存容量
   * @param {number} ttl - 缓存过期时间（毫秒），0 表示永不过期
   */
  constructor(maxSize = 1000, ttl = 0) {
    this.maxSize = maxSize
    this.ttl = ttl
    this.cache = new Map()
  }

  /**
   * 获取缓存值
   * @param {string} key - 缓存键
   * @returns {any} - 缓存值，如果不存在或已过期则返回 undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined
    }

    const item = this.cache.get(key)
    
    // 检查是否过期
    if (this.ttl > 0 && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // 更新访问时间（LRU 策略）
    this.cache.delete(key)
    this.cache.set(key, { ...item, timestamp: Date.now() })
    
    return item.value
  }

  /**
   * 设置缓存值
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   */
  set(key, value) {
    // 如果键已存在，先删除（为了更新顺序）
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 如果达到最大容量，删除最旧的项（Map 的第一个项）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    // 添加新项
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  /**
   * 检查键是否存在且未过期
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false
    }

    const item = this.cache.get(key)
    
    // 检查是否过期
    if (this.ttl > 0 && Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 删除指定键
   * @param {string} key - 缓存键
   * @returns {boolean} - 是否成功删除
   */
  delete(key) {
    return this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear()
  }

  /**
   * 获取当前缓存大小
   * @returns {number}
   */
  get size() {
    return this.cache.size
  }

  /**
   * 清理过期的缓存项
   * @returns {number} - 清理的项数
   */
  cleanup() {
    if (this.ttl === 0) {
      return 0
    }

    let cleaned = 0
    const now = Date.now()
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 获取缓存统计信息
   * @returns {Object}
   */
  getStats() {
    const now = Date.now()
    let expired = 0
    
    if (this.ttl > 0) {
      for (const item of this.cache.values()) {
        if (now - item.timestamp > this.ttl) {
          expired++
        }
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expired,
      ttl: this.ttl,
      utilizationRate: (this.cache.size / this.maxSize * 100).toFixed(2) + '%'
    }
  }
}

/**
 * 创建 LRU 缓存的 Composable
 * @param {number} maxSize - 最大缓存容量
 * @param {number} ttl - 缓存过期时间（毫秒）
 * @returns {LRUCache}
 */
export function useLRUCache(maxSize = 1000, ttl = 0) {
  return new LRUCache(maxSize, ttl)
}