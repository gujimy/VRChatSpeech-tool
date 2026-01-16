import { ref, onUnmounted } from 'vue'

/**
 * 语音识别组合式函数
 * 封装 Web Speech API 的语音识别功能
 */
export function useSpeechRecognition() {
  const status = ref('初始化中...')
  const isRecognizing = ref(false)
  const interimText = ref('')
  const lang = ref('zh-CN')
  
  let recognition = null
  // let stream = null // 由 useMicrophone 统一管理
  let maxSensitivity = 0
  let sensitivityThreshold = 0
  let visibilityCheckInterval = null

  /**
   * 初始化语音识别
   */
  const init = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      status.value = '不支持'
      console.error('浏览器不支持 Web Speech API')
      return false
    }
    
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang.value
    recognition.maxAlternatives = 1
    
    status.value = '就绪'
    return true
  }

  /**
   * 初始化音频灵敏度检测
   * @param {MediaStream} stream - 外部传入的音频流
   */
  const initSensitivity = async (stream) => {
    if (!stream) {
      console.error('初始化灵敏度检测失败: 未提供 MediaStream')
      return false
    }
    
    try {
      const audioContext = new AudioContext()
      const mediaStreamAudioSourceNode = audioContext.createMediaStreamSource(stream)
      const analyserNode = audioContext.createAnalyser()
      mediaStreamAudioSourceNode.connect(analyserNode)

      const pcmData = new Float32Array(analyserNode.fftSize)
      const onFrame = () => {
        // 流的生命周期由外部管理，这里不再检查
        analyserNode.getFloatTimeDomainData(pcmData)
        let sumSquares = 0.0
        for (const amplitude of pcmData) {
          sumSquares += amplitude * amplitude
        }
        const currentSensitivity = Math.sqrt(sumSquares / pcmData.length)
        
        if (currentSensitivity > maxSensitivity) {
          maxSensitivity = currentSensitivity
        }
        
        window.requestAnimationFrame(onFrame)
      }
      window.requestAnimationFrame(onFrame)
      
      console.log('🎤 麦克风权限已获取')
      return true
    } catch (e) {
      console.error('麦克风权限被拒绝或不可用:', e)
      return false
    }
  }

  /**
   * 设置识别事件处理器
   */
  const setupEvents = (onResult, onError) => {
    if (!recognition) return

    recognition.onstart = () => {
      isRecognizing.value = true
      status.value = '正在识别...'
    }
    
    recognition.onresult = (event) => {
      // 检查灵敏度门限（将 0-100 的用户设置转换为 0-1 的阈值）
      const threshold = sensitivityThreshold / 100
      if (sensitivityThreshold > 0 && maxSensitivity < threshold) {
        console.log(`🔇 音量过低: ${(maxSensitivity * 100).toFixed(1)} < ${sensitivityThreshold}, 已忽略`)
        return
      }
      
      let interim = ''
      let final = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      
      interimText.value = interim
      
      if (final) {
        maxSensitivity = 0
        interimText.value = ''
        if (onResult) {
          onResult(final.trim())
        }
      }
    }
    
    recognition.onerror = (event) => {
      // 错误类型映射和用户友好提示
      const errorMessages = {
        'no-speech': { log: false, message: '未检测到语音' },
        'aborted': { log: false, message: '识别已中止' },
        'audio-capture': { log: true, message: '无法访问麦克风，请检查权限设置' },
        'network': { log: true, message: '网络连接失败，请检查网络' },
        'not-allowed': { log: true, message: '麦克风权限被拒绝，请在浏览器设置中允许' },
        'service-not-allowed': { log: true, message: '语音识别服务不可用' },
        'bad-grammar': { log: true, message: '语法错误' },
        'language-not-supported': { log: true, message: '不支持当前语言' }
      }
      
      const errorInfo = errorMessages[event.error] || { log: true, message: `未知错误: ${event.error}` }
      
      // 根据错误类型决定是否记录日志
      if (errorInfo.log) {
        console.error(`❌ 语音识别错误 [${event.error}]:`, errorInfo.message)
        status.value = errorInfo.message
        
        if (onError) {
          onError(errorInfo.message)
        }
      } else {
        // 静默错误，仅记录调试信息
        console.debug(`🔇 语音识别: ${errorInfo.message}`)
      }
    }
    
    recognition.onend = () => {
      if (isRecognizing.value) {
        // 自动重启识别
        setTimeout(() => {
          if (isRecognizing.value && recognition) {
            try {
              recognition.start()
            } catch (e) {
              console.error(`重启失败: ${e.message}`)
            }
          }
        }, 100)
      } else {
        status.value = '已停止'
      }
    }
  }

  /**
   * 开始识别
   */
  const start = () => {
    if (!recognition || isRecognizing.value) return
    
    try {
      recognition.start()
      console.log('🎙️ 语音识别已启动')
      
      // 启动后台检测
      startVisibilityCheck()
    } catch (e) {
      status.value = '启动失败'
      console.error('❌ 启动识别失败:', e)
    }
  }
  
  /**
   * 启动页面可见性检测
   * 当页面从后台切换回前台时,检查并恢复识别
   */
  const startVisibilityCheck = () => {
    if (visibilityCheckInterval) return
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 定期检查识别状态
    visibilityCheckInterval = setInterval(() => {
      if (isRecognizing.value && recognition && document.visibilityState === 'visible') {
        // 如果应该在识别但可能被暂停,尝试重启
        try {
          // 检查是否真的在运行,如果没有就重启
          if (status.value === '就绪' || status.value === '已停止') {
            console.log('🔄 检测到识别可能已停止,尝试恢复...')
            recognition.start()
          }
        } catch (e) {
          // 如果已经在运行会抛出错误,这是正常的
          if (!e.message.includes('already started')) {
            console.error('恢复识别失败:', e)
          }
        }
      }
    }, 3000) // 每3秒检查一次
  }
  
  /**
   * 处理页面可见性变化
   */
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && isRecognizing.value && recognition) {
      console.log('📱 页面切换到前台,检查识别状态...')
      setTimeout(() => {
        try {
          if (status.value !== '正在识别...') {
            console.log('🔄 恢复语音识别...')
            recognition.start()
          }
        } catch (e) {
          if (!e.message.includes('already started')) {
            console.error('恢复识别失败:', e)
          }
        }
      }, 500)
    }
  }
  
  /**
   * 停止页面可见性检测
   */
  const stopVisibilityCheck = () => {
    if (visibilityCheckInterval) {
      clearInterval(visibilityCheckInterval)
      visibilityCheckInterval = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  /**
   * 停止识别
   */
  const stop = () => {
    if (!recognition || !isRecognizing.value) return
    
    isRecognizing.value = false
    recognition.stop()
    interimText.value = ''
    
    // 停止后台检测
    stopVisibilityCheck()
  }

  /**
   * 更改识别语言
   * 需要重启识别才能应用新语言
   */
  const changeLang = (newLang) => {
    const wasRecognizing = isRecognizing.value
    lang.value = newLang
    
    if (recognition) {
      // 先停止当前识别
      if (wasRecognizing) {
        isRecognizing.value = false
        try {
          recognition.abort() // 使用 abort 立即停止，而不是 stop
        } catch (e) {
          // 忽略停止时的错误
        }
      }
      
      // 更新语言设置
      recognition.lang = newLang
      console.log(`🌐 语言已切换到: ${newLang}`)
      
      // 如果之前在识别，则重新启动
      if (wasRecognizing) {
        setTimeout(() => {
          isRecognizing.value = true
          try {
            recognition.start()
            console.log('🎙️ 语音识别已重启（新语言）')
          } catch (e) {
            console.error('重启识别失败:', e)
            isRecognizing.value = false
          }
        }, 200) // 给一点延迟确保之前的识别完全停止
      }
    }
  }

  /**
   * 设置灵敏度门限
   */
  const setSensitivity = (value) => {
    sensitivityThreshold = value
  }

  /**
   * 清理资源
   */
  const cleanup = () => {
    stopVisibilityCheck()
    
    if (recognition) {
      recognition.stop()
      recognition = null
    }
    // 流的清理交由 useMicrophone 处理
    // if (stream) {
    //   stream.getTracks().forEach(track => track.stop())
    //   stream = null
    // }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    status,
    isRecognizing,
    interimText,
    lang,
    init,
    initSensitivity,
    setupEvents,
    start,
    stop,
    changeLang,
    setSensitivity,
    cleanup
  }
}