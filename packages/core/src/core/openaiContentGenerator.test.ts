/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIContentGenerator } from './openaiContentGenerator.js';
import type { CustomLlmConfig } from './customLlmAuth.js';
import type {
  GenerateContentParameters,
  CountTokensParameters,
} from '@google/genai';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIContentGenerator', () => {
  let config: CustomLlmConfig;
  let generator: OpenAIContentGenerator;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      endpoint: 'https://api.openai.com',
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      topP: 0.9,
      timeout: 30000,
      retries: 3,
      streamEnabled: true,
    };
    generator = new OpenAIContentGenerator(config);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateContent', () => {
    it('应该成功生成内容', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const result = await generator.generateContent(request, 'test-prompt-id');

      expect(result).toEqual({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Hello! How can I help you?' }],
            },
            finishReason: 'STOP',
            index: 0,
          },
        ],
        text: 'Hello! How can I help you?',
        data: '',
        functionCalls: [],
        executableCode: '',
        codeExecutionResult: '',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: expect.stringContaining('"model":"gpt-3.5-turbo"'),
        }),
      );
    });

    it('应该处理系统指令', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'I am a helpful assistant.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        config: {
          systemInstruction: 'You are a helpful assistant.',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      await generator.generateContent(request, 'test-prompt-id');

      const callArgs = mockFetch.mock.calls[0][1];
      const requestBody = JSON.parse(callArgs.body);

      expect(requestBody.messages).toEqual([
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: 'Hello',
        },
      ]);
    });

    it('应该处理API错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid API key'),
      });

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      await expect(
        generator.generateContent(request, 'test-prompt-id'),
      ).rejects.toThrow(
        'OpenAI API调用失败: HTTP 401: Unauthorized\nInvalid API key',
      );
    });

    it('应该处理网络错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      await expect(
        generator.generateContent(request, 'test-prompt-id'),
      ).rejects.toThrow('OpenAI API调用失败: Network error');
    });

    it('应该处理超时', async () => {
      const controller = new AbortController();
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            controller.abort();
            reject(new Error('Request timeout'));
          }, 100);
        });
      });

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      await expect(
        generator.generateContent(request, 'test-prompt-id'),
      ).rejects.toThrow();
    });
  });

  describe('generateContentStream', () => {
    it('应该处理流式响应', async () => {
      const mockStreamResponse = {
        body: {
          getReader: () => ({
            read: vi
              .fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}\n\n',
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(
                  'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" world"}}]}\n\n',
                ),
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode('data: [DONE]\n\n'),
              })
              .mockResolvedValueOnce({
                done: true,
                value: undefined,
              }),
            releaseLock: vi.fn(),
          }),
        },
        ok: true,
      };

      mockFetch.mockResolvedValueOnce(mockStreamResponse);

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const results: any[] = [];
      const stream = await generator.generateContentStream(
        request,
        'test-prompt-id',
      );
      for await (const result of stream) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].candidates[0].content.parts[0].text).toBe('Hello');
      expect(results[1].candidates[0].content.parts[0].text).toBe(' world');
    });

    it('应该处理流式响应错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      await expect(async () => {
        const stream = await generator.generateContentStream(
          request,
          'test-prompt-id',
        );
        for await (const _ of stream) {
          // 消费流
        }
      }).rejects.toThrow('OpenAI流式API调用失败: HTTP 400: Bad Request');
    });
  });

  describe('countTokens', () => {
    it('应该估算token数量', async () => {
      const request: CountTokensParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello world! This is a test message.' }],
          },
        ],
      };

      const result = await generator.countTokens(request);

      // 粗略估算：40个字符约等于10个token
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.totalTokens).toBeLessThanOrEqual(20);
    });
  });

  describe('embedContent', () => {
    it('应该抛出不支持错误', async () => {
      const request = {
        content: {
          parts: [{ text: 'Hello' }],
        },
      };

      await expect(generator.embedContent(request as any)).rejects.toThrow(
        'OpenAI ContentGenerator不支持嵌入功能',
      );
    });
  });

  describe('convertToOpenAIRequest', () => {
    it('应该正确转换基本请求', () => {
      const request: GenerateContentParameters = {
        model: 'gpt-3.5-turbo',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
          {
            role: 'model',
            parts: [{ text: 'Hi there!' }],
          },
        ],
      };

      // 使用反射访问私有方法进行测试
      const converted = (generator as any).convertToOpenAIRequest(request);

      expect(converted).toEqual({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
      });
    });
  });

  describe('convertFinishReason', () => {
    it('应该正确转换完成原因', () => {
      const convertFinishReason = (generator as any).convertFinishReason;

      expect(convertFinishReason('stop')).toBe('STOP');
      expect(convertFinishReason('length')).toBe('MAX_TOKENS');
      expect(convertFinishReason('content_filter')).toBe('SAFETY');
      expect(convertFinishReason('unknown')).toBe('OTHER');
    });
  });
});
