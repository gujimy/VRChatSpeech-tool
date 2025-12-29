import { createApp } from 'vue'
import App from './App.vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './assets/styles/global.css'

// 创建 Vuetify 实例
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'midnight_purple',
    themes: {
      midnight_purple: {
        dark: true,
        colors: {
          primary: '#7c4dff',      // 亮紫色
          secondary: '#b388ff',    // 浅紫色
          accent: '#ea80fc',       // 粉紫色
          error: '#ff5252',
          warning: '#ffb74d',
          info: '#40c4ff',
          success: '#69f0ae',
          background: '#1a1a2e',   // 深蓝紫背景
          surface: '#16213e'       // 稍浅的表面色
        }
      },
      ocean_blue: {
        dark: true,
        colors: {
          primary: '#0288d1',      // 海蓝色
          secondary: '#4fc3f7',    // 浅蓝色
          accent: '#00bcd4',       // 青色
          error: '#ff5252',
          warning: '#ffb74d',
          info: '#40c4ff',
          success: '#69f0ae',
          background: '#0d1b2a',   // 深海蓝背景
          surface: '#1b263b'       // 稍浅的表面色
        }
      },
      cotton_candy: {
        dark: false,
        colors: {
          primary: '#e91e63',      // 粉红色
          secondary: '#f48fb1',    // 浅粉色
          accent: '#ff80ab',       // 亮粉色
          error: '#ff5252',
          warning: '#ffb74d',
          info: '#40c4ff',
          success: '#69f0ae',
          background: '#fce4ec',   // 浅粉背景
          surface: '#ffffff'
        }
      },
      forest_dark: {
        dark: true,
        colors: {
          primary: '#4caf50',      // 绿色
          secondary: '#81c784',    // 浅绿色
          accent: '#a5d6a7',       // 亮绿色
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196f3',
          success: '#4caf50',
          background: '#1b2f1b',   // 深绿背景
          surface: '#2e4a2e'       // 稍浅的表面色
        }
      },
      forest_light: {
        dark: false,
        colors: {
          primary: '#43a047',      // 绿色
          secondary: '#81c784',    // 浅绿色
          accent: '#a5d6a7',       // 亮绿色
          error: '#f44336',
          warning: '#ff9800',
          info: '#2196f3',
          success: '#4caf50',
          background: '#e8f5e9',   // 浅绿背景
          surface: '#ffffff'
        }
      },
      warm_sunset: {
        dark: true,
        colors: {
          primary: '#ff7043',      // 暖橙色
          secondary: '#ffab91',    // 浅橙色
          accent: '#ff8a65',       // 亮橙色
          error: '#ff5252',
          warning: '#ffd54f',
          info: '#40c4ff',
          success: '#69f0ae',
          background: '#2d1f1f',   // 深暖色背景
          surface: '#3e2723'       // 稍浅的表面色
        }
      }
    }
  }
})

// 创建应用
const app = createApp(App)
app.use(vuetify)
app.mount('#app')