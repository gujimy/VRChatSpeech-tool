import { ref, onUnmounted } from 'vue'

/**
 * 音频可视化组合式函数
 * 提供实时音量波形数据用于可视化
 */
export function useAudioVisualizer() {
  const isActive = ref(false)
  const volumeLevel = ref(0)
  const waveformData = ref([])
  const frequencyData = ref([])
  
  let audioContext = null
  let analyser = null
  let mediaStream = null
  let animationFrameId = null
  
  // 波形历史数据，用于绘制波形
  const waveformHistory = ref([])
  const historyLength = 64 // 波形条数
  
  /**
   * 初始化音频分析器
   * @param {string} deviceId - 音频设备ID
   */
  const init = async (deviceId = 'default') => {
    try {
      // 获取麦克风权限
      const constraints = {
        audio: deviceId === 'default' ? true : { deviceId: { exact: deviceId } }
      }
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      
      // 创建音频上下文
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // 创建分析器节点
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8
      
      // 连接音频源到分析器
      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyser)
      
      // 初始化波形历史
      waveformHistory.value = new Array(historyLength).fill(0)
      
      isActive.value = true
      console.log('🎵 音频可视化已初始化')
      
      // 开始分析
      startAnalysis()
      
      return true
    } catch (error) {
      console.error('初始化音频可视化失败:', error)
      return false
    }
  }
  
  /**
   * 开始音频分析
   */
  const startAnalysis = () => {
    if (!analyser) return
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeDataArray = new Uint8Array(analyser.fftSize)
    
    const analyze = () => {
      if (!isActive.value) return
      
      // 获取频率数据
      analyser.getByteFrequencyData(dataArray)
      frequencyData.value = Array.from(dataArray)
      
      // 获取时域数据（波形）
      analyser.getByteTimeDomainData(timeDataArray)
      waveformData.value = Array.from(timeDataArray)
      
      // 计算当前音量级别 (0-100)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i]
      }
      const average = sum / bufferLength
      volumeLevel.value = Math.round((average / 255) * 100)
      
      // 更新波形历史
      waveformHistory.value.shift()
      waveformHistory.value.push(volumeLevel.value)
      
      animationFrameId = requestAnimationFrame(analyze)
    }
    
    analyze()
  }
  
  /**
   * 停止音频分析
   */
  const stopAnalysis = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    isActive.value = false
    stopAnalysis()
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }
    
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
    
    analyser = null
    volumeLevel.value = 0
    waveformHistory.value = new Array(historyLength).fill(0)
  }
  
  /**
   * 获取用于绘制的波形数据
   * 返回归一化的数组 (0-1)
   */
  const getNormalizedWaveform = () => {
    return waveformHistory.value.map(v => v / 100)
  }
  
  /**
   * 获取频率带数据（用于频谱可视化）
   * @param {number} bands - 返回的频段数量
   */
  const getFrequencyBands = (bands = 16) => {
    if (frequencyData.value.length === 0) {
      return new Array(bands).fill(0)
    }
    
    const bandSize = Math.floor(frequencyData.value.length / bands)
    const result = []
    
    for (let i = 0; i < bands; i++) {
      let sum = 0
      for (let j = 0; j < bandSize; j++) {
        sum += frequencyData.value[i * bandSize + j] || 0
      }
      result.push(Math.round((sum / bandSize / 255) * 100))
    }
    
    return result
  }
  
  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    isActive,
    volumeLevel,
    waveformData,
    frequencyData,
    waveformHistory,
    init,
    cleanup,
    getNormalizedWaveform,
    getFrequencyBands
  }
}