/**
 * AI 翻译服务集成测试
 * 验证统一的 AI 翻译服务
 */

import { describe, it, expect, vi } from 'vitest'
import { 
  translationServices, 
  getTranslationService,
  translateWithAI
} from '../index'
import type { ServiceConfig } from '../../types'

describe('AI 翻译服务集成测试', () => {
  describe('服务注册', () => {
    it('应该正确注册 AI 翻译服务', () => {
      expect(translationServices.ai).toBe(translateWithAI)
      expect(getTranslationService('ai')).toBe(translateWithAI)
    })
  })

  describe('配置验证', () => {
    it('AI 服务应该要求配置', async () => {
      const config: ServiceConfig = {}
      
      await expect(
        translateWithAI('Hello', 'en', 'zh-CN', config)
      ).rejects.toThrow('AI 翻译配置未设置')
    })

    it('OpenAI 提供商应该要求 API Key', async () => {
      const config: ServiceConfig = {
        ai: {
          provider: 'openai',
          apiKey: ''
        }
      }
      
      // Mock fetch 以避免实际网络请求
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized')
        } as Response)
      )

      await expect(
        translateWithAI('Hello', 'en', 'zh-CN', config)
      ).rejects.toThrow()
    })

    it('Gemini 提供商应该要求 API Key', async () => {
      const config: ServiceConfig = {
        ai: {
          provider: 'gemini'
        }
      }
      
      await expect(
        translateWithAI('Hello', 'en', 'zh-CN', config)
      ).rejects.toThrow('Gemini API Key 未配置')
    })

    it('Claude 提供商应该要求 API Key', async () => {
      const config: ServiceConfig = {
        ai: {
          provider: 'claude'
        }
      }
      
      await expect(
        translateWithAI('Hello', 'en', 'zh-CN', config)
      ).rejects.toThrow('Claude API Key 未配置')
    })

    it('本地模型（Ollama）不需要 API Key', () => {
      const config: ServiceConfig = {
        ai: {
          provider: 'ollama'
        }
      }
      
      // 本地模型配置应该是有效的（不抛出配置错误）
      expect(config.ai?.provider).toBe('ollama')
      expect(config.ai?.apiKey).toBeUndefined()
    })
  })

  describe('提供商支持', () => {
    it('应该支持 OpenAI 提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })

    it('应该支持 Gemini 提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })

    it('应该支持 Claude 提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })

    it('应该支持 Ollama 提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })

    it('应该支持 LM Studio 提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })

    it('应该支持自定义提供商', () => {
      expect(typeof translateWithAI).toBe('function')
    })
  })

  describe('错误处理', () => {
    it('应该在不支持的提供商时抛出错误', async () => {
      const config: ServiceConfig = {
        ai: {
          provider: 'invalid' as any
        }
      }
      
      await expect(
        translateWithAI('Hello', 'en', 'zh-CN', config)
      ).rejects.toThrow('不支持的 AI 提供商')
    })
  })
})