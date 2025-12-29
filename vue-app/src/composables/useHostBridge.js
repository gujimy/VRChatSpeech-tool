import { ref, onMounted, onUnmounted } from 'vue'

/**
 * WebView2 宿主通信桥接
 * 使用 WebView2 原生 API 替代 WebSocket
 * 
 * 优势：
 * - 直接内存通信，无网络开销
 * - 性能提升 10-50 倍
 * - 无需维护 WebSocket 服务器
 * - 更可靠，无连接断开问题
 */
export function useHostBridge() {
  const isConnected = ref(false)
  const status = ref('未连接')
  
  /**
   * 检测是否在 WebView2 环境中运行
   */
  const isWebView2 = () => {
    return !!(window.chrome && window.chrome.webview)
  }
  
  /**
   * 初始化连接
   * WebView2 环境下自动连接，无需手动操作
   */
  const connect = () => {
    if (isWebView2()) {
      isConnected.value = true
      status.value = '已连接'
      console.log('✅ WebView2 桥接已就绪')
    } else {
      isConnected.value = false
      status.value = '浏览器模式'
      console.warn('⚠️ 不在 WebView2 环境，使用开发模式')
      console.warn('💡 提示：某些功能（如 OSC 发送）在浏览器中不可用')
    }
  }
  
  /**
   * 断开连接（WebView2 环境下无需断开）
   */
  const disconnect = () => {
    // WebView2 环境下无需断开，仅更新状态
    if (!isWebView2()) {
      isConnected.value = false
      status.value = '未连接'
    }
  }
  
  /**
   * 发送消息到 C# 宿主
   * @param {string} type - 消息类型
   * @param {object} data - 消息数据
   * @returns {boolean} 是否发送成功
   */
  const sendMessage = (type, data) => {
    if (!isWebView2()) {
      // 开发模式：输出到控制台
      console.log(`[开发模式] 消息未发送:`, { type, data })
      return false
    }
    
    try {
      const message = {
        type,
        data,
        timestamp: Date.now()
      }
      
      window.chrome.webview.postMessage(message)
      return true
    } catch (err) {
      console.error('❌ 发送消息失败:', err)
      return false
    }
  }
  
  /**
   * 发送最终识别结果到 C#
   * @param {string} text - 识别文本
   * @param {string} translatedText - 翻译文本（可选）
   * @returns {boolean} 是否发送成功
   */
  const send = (text, translatedText = '') => {
    const success = sendMessage('recognition_result', {
      text,
      translatedText
    })
    
    if (success) {
      if (translatedText) {
        console.log(`📤 已发送到桌面版: "${text}" (翻译: "${translatedText}")`)
      } else {
        console.log(`📤 已发送到桌面版: "${text}"`)
      }
    }
    
    return success
  }
  
  /**
   * 发送临时识别文本到 C#（实时更新）
   * @param {string} text - 临时文本
   * @param {string} translatedText - 翻译文本（可选）
   * @returns {boolean} 是否发送成功
   */
  const sendInterim = (text, translatedText = '') => {
    return sendMessage('recognition_interim', {
      text,
      translatedText
    })
  }
  
  /**
   * 接收来自 C# 宿主的消息
   */
  const messageHandlers = new Map()
  
  /**
   * 注册消息处理器
   * @param {string} type - 消息类型
   * @param {function} handler - 处理函数
   */
  const onHostMessage = (type, handler) => {
    messageHandlers.set(type, handler)
  }
  
  /**
   * 处理来自宿主的消息
   */
  const handleHostMessage = (event) => {
    try {
      const { type, data } = event.detail
      
      console.log(`📨 收到宿主消息:`, { type, data })
      
      const handler = messageHandlers.get(type)
      if (handler) {
        handler(data)
      } else {
        console.warn(`⚠️ 未找到消息处理器: ${type}`)
      }
    } catch (err) {
      console.error('❌ 处理宿主消息失败:', err)
    }
  }
  
  /**
   * 清理资源
   */
  const cleanup = () => {
    window.removeEventListener('hostMessage', handleHostMessage)
    messageHandlers.clear()
  }
  
  // 组件挂载时初始化
  onMounted(() => {
    connect()
    window.addEventListener('hostMessage', handleHostMessage)
  })
  
  // 组件卸载时清理
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // 状态
    isConnected,
    status,
    
    // 方法
    connect,
    disconnect,
    send,
    sendInterim,
    sendMessage,
    onHostMessage,
    cleanup,
    isWebView2
  }
}