import { ref, watch, onUnmounted } from 'vue'

/**
 * 防抖 Composable
 * 用于延迟执行频繁触发的操作
 * 
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Object} - 包含防抖函数和取消方法
 */
export function useDebounce(fn, delay = 300) {
  let timeoutId = null
  
  /**
   * 防抖函数
   */
  const debouncedFn = (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
  
  /**
   * 取消待执行的防抖函数
   */
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  /**
   * 立即执行函数（跳过防抖）
   */
  const flush = (...args) => {
    cancel()
    fn(...args)
  }
  
  // 组件卸载时清理
  onUnmounted(() => {
    cancel()
  })
  
  return {
    debouncedFn,
    cancel,
    flush
  }
}

/**
 * 防抖 Ref Composable
 * 监听 ref 值变化并防抖执行回调
 * 
 * @param {Ref} source - 要监听的 ref
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Object} - 包含取消和立即执行方法
 */
export function useDebouncedRef(source, callback, delay = 300) {
  const { debouncedFn, cancel, flush } = useDebounce(callback, delay)
  
  watch(source, (newValue, oldValue) => {
    debouncedFn(newValue, oldValue)
  })
  
  return {
    cancel,
    flush
  }
}

/**
 * 创建防抖的 ref
 * 返回一个新的 ref，其值会在延迟后更新
 * 
 * @param {any} initialValue - 初始值
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Object} - 包含即时值和防抖值的 ref
 */
export function createDebouncedRef(initialValue, delay = 300) {
  const immediate = ref(initialValue)
  const debounced = ref(initialValue)
  
  const { cancel } = useDebouncedRef(immediate, (newValue) => {
    debounced.value = newValue
  }, delay)
  
  return {
    immediate,
    debounced,
    cancel
  }
}