# 实时语音识别 Vue 应用

基于 Vue 3 + Vuetify 3 的现代化语音识别 Web 应用，参考 mimiuchi 设计。

## ✨ 特性

- 🎤 **实时语音识别**：使用 Web Speech API 进行实时语音转文字
- 🌐 **WebSocket 连接**：与桌面版程序实时通信
- 🎨 **现代化 UI**：基于 Vuetify 3 的 Material Design 界面
- 🌈 **多主题支持**：午夜紫、棉花糖、森林深绿、森林浅绿
- 📱 **响应式设计**：完美适配桌面和移动设备
- ⚡ **文本淡出**：自动淡出旧文本，保持界面清爽
- 🔧 **灵活配置**：支持语言、灵敏度、主题等多项设置

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 生产构建

```bash
npm run build
```

构建产物将输出到 `dist` 目录

### 预览生产构建

```bash
npm run preview
```

## 📖 使用说明

### 主页面

- **文本显示区**：显示实时识别的文本和历史记录
- **底部输入栏**：
  - 文本输入框：手动输入文本
  - 麦克风按钮：开启/关闭语音识别
  - 连接状态：显示与桌面版的连接状态

### 设置页面

#### 语音识别设置
- **识别语言**：选择语音识别的语言（中文、英文、日文等）
- **灵敏度**：调整语音识别的灵敏度（0-10）

#### 桌面版连接
- **启用桌面版连接**：开关 WebSocket 连接
- **WebSocket 地址**：配置桌面版服务器地址（默认：ws://localhost:8765）

#### 外观设置
- **字体大小**：调整文本显示的字体大小（16-48px）
- **文本淡出时间**：设置文本自动淡出的时间（0-10秒，0 表示不淡出）
- **主题**：选择应用主题

## 🎨 主题

### 午夜紫（默认）
深色主题，紫色调，适合夜间使用

### 棉花糖
浅色主题，粉色调，温馨可爱

### 森林深绿
深色主题，绿色调，护眼舒适

### 森林浅绿
浅色主题，绿色调，清新自然

## 🔧 技术栈

- **Vue 3**：渐进式 JavaScript 框架
- **Vuetify 3**：Material Design 组件库
- **Vite**：下一代前端构建工具
- **Web Speech API**：浏览器原生语音识别 API
- **WebSocket**：实时双向通信

## 📝 配置说明

所有设置会自动保存到浏览器的 localStorage，下次打开时自动恢复。

### 默认配置

```javascript
{
  enableDesktop: true,           // 启用桌面版连接
  wsUrl: 'ws://localhost:8765',  // WebSocket 地址
  lang: 'zh-CN',                 // 识别语言
  sensitivity: 0,                // 灵敏度
  ui: {
    fontSize: 24,                // 字体大小
    fadeTime: 5,                 // 淡出时间（秒）
    theme: 'midnight_purple',    // 主题
    backgroundColor: '#1a1a2e'   // 背景色
  }
}
```

## 🌐 浏览器兼容性

- Chrome/Edge 25+
- Safari 14.1+
- Firefox（需要启用实验性功能）

**注意**：Web Speech API 在 Chrome/Edge 上支持最好。

## 📄 许可证

MIT License

## 🙏 致谢

UI 设计参考了 [mimiuchi](https://github.com/naeruru/mimiuchi) 项目