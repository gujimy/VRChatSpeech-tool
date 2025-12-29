import { ref } from 'vue'

/**
 * @typedef {Object} RecognitionResult
 * @property {string} text - 识别的文本
 * @property {boolean} isManual - 是否为手动输入
 * @property {string} timestamp - ISO 格式的时间戳
 * @property {boolean} fadeOut - 是否正在淡出
 * @property {string} [translatedText] - 翻译后的文本（可选）
 */

/**
 * 识别结果管理组合式函数
 * 管理识别结果的存储和显示
 * @returns {{
 *   results: import('vue').Ref<RecognitionResult[]>,
 *   addResult: (text: string, isManual?: boolean) => void,
 *   fadeOutResult: (index: number) => void,
 *   clearResults: () => void,
 *   removeResult: (index: number) => void,
 *   getLatestResult: () => RecognitionResult | null,
 *   exportAsText: () => string
 * }}
 */
export function useRecognitionResults() {
  const results = ref([])
  const maxResults = 20

  /**
   * 添加识别结果
   * @param {string} text - 识别的文本
   * @param {boolean} [isManual=false] - 是否为手动输入
   */
  const addResult = (text, isManual = false) => {
    if (!text || !text.trim()) return

    const result = {
      text: text.trim(),
      isManual,
      timestamp: new Date().toISOString(),
      fadeOut: false
    }

    // 最新记录添加到数组末尾，旧记录在前面
    results.value.push(result)
    
    // 限制结果数量，删除最旧的记录（数组开头）
    if (results.value.length > maxResults) {
      results.value.shift()
    }

    console.log(`添加结果: "${text}" (手动: ${isManual})`)
  }

  /**
   * 淡出指定结果
   * @param {number} index - 结果索引
   */
  const fadeOutResult = (index) => {
    if (index >= 0 && index < results.value.length) {
      results.value[index].fadeOut = true
      // 淡出完成后移除
      setTimeout(() => {
        if (index < results.value.length) {
          results.value.splice(index, 1)
        }
      }, 5000)
    }
  }

  /**
   * 清空所有结果
   */
  const clearResults = () => {
    results.value = []
  }

  /**
   * 删除指定结果
   * @param {number} index - 结果索引
   */
  const removeResult = (index) => {
    if (index >= 0 && index < results.value.length) {
      results.value.splice(index, 1)
    }
  }

  /**
   * 获取最近的结果
   * @returns {RecognitionResult | null}
   */
  const getLatestResult = () => {
    return results.value.length > 0 ? results.value[0] : null
  }

  /**
   * 导出结果为文本
   * @returns {string}
   */
  const exportAsText = () => {
    return results.value
      .map(r => `[${r.timestamp}] ${r.isManual ? '[手动] ' : ''}${r.text}`)
      .join('\n')
  }

  return {
    results,
    addResult,
    fadeOutResult,
    clearResults,
    removeResult,
    getLatestResult,
    exportAsText
  }
}