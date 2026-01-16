import { ref, onUnmounted } from 'vue'

// 全局单一实例
const stream = ref(null)
const isInitialized = ref(false)
const error = ref(null)

/**
 * 麦克风管理组合式函数 (单例模式)
 * 统一获取和管理麦克风 MediaStream
 */
export function useMicrophone() {
  /**
   * 初始化麦克风，获取音频流
   * @param {string} deviceId - 音频设备ID
   * @returns {Promise<MediaStream>}
   */
  const initMicrophone = async (deviceId = 'default') => {
    // 如果已经初始化，先清理旧的流
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
      stream.value = null
    }

    try {
      const constraints = {
        audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } }
      }
      stream.value = await navigator.mediaDevices.getUserMedia(constraints)
      isInitialized.value = true
      error.value = null
      console.log('🎤 麦克风流已获取')
      return stream.value
    } catch (e) {
      error.value = e
      isInitialized.value = false
      console.error('🎤 获取麦克风流失败:', e)
      // 重新抛出异常，让调用者可以捕获并处理
      throw e
    }
  }

  /**
   * 清理麦克风资源
   */
  const cleanupMicrophone = () => {
    if (stream.value) {
      stream.value.getTracks().forEach(track => track.stop())
      stream.value = null
    }
    isInitialized.value = false
    console.log('🎤 麦克风流已清理')
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    cleanupMicrophone()
  })

  return {
    stream,
    isInitialized,
    error,
    initMicrophone,
    cleanupMicrophone
  }
}