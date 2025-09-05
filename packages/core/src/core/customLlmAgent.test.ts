/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomLLMAgent } from './customLlmAgent.js';
import type { ContentGenerator } from './contentGenerator.js';
import type {
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensResponse,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { FinishReason } from '@google/genai';
import { UserTierId } from '../code_assist/types.js';

// Mock ContentGenerator
class MockContentGenerator implements ContentGenerator {
  userTier?: UserTierId;

  constructor(
    private shouldFail: boolean = false,
    userTier?: UserTierId,
  ) {
    this.userTier = userTier;
  }

  async generateContent(
    _request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    if (this.shouldFail) {
      throw new Error('Mock generateContent failed');
    }
    return {
      candidates: [
        {
          content: {
            parts: [{ text: 'Mock response' }],
            role: 'model',
          },
          finishReason: FinishReason.STOP,
        },
      ],
      text: 'Mock response',
      data: '',
      functionCalls: [],
      executableCode: '',
      codeExecutionResult: '',
    };
  }

  async generateContentStream(
    _request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    if (this.shouldFail) {
      throw new Error('Mock generateContentStream failed');
    }
    return this.createMockStream();
  }

  async countTokens(
    _request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    if (this.shouldFail) {
      throw new Error('Mock countTokens failed');
    }
    return { totalTokens: 10 };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    if (this.shouldFail) {
      throw new Error('Mock embedContent failed');
    }
    return {
      embeddings: [{ values: [0.1, 0.2, 0.3] }],
    };
  }

  private async *createMockStream(): AsyncGenerator<GenerateContentResponse> {
    yield {
      candidates: [
        {
          content: {
            parts: [{ text: 'Mock' }],
            role: 'model',
          },
          finishReason: undefined,
        },
      ],
      text: 'Mock',
      data: '',
      functionCalls: [],
      executableCode: '',
      codeExecutionResult: '',
    };
    yield {
      candidates: [
        {
          content: {
            parts: [{ text: ' stream' }],
            role: 'model',
          },
          finishReason: FinishReason.STOP,
        },
      ],
      text: ' stream',
      data: '',
      functionCalls: [],
      executableCode: '',
      codeExecutionResult: '',
    };
  }
}

describe('CustomLLMAgent', () => {
  let geminiGenerator: MockContentGenerator;
  let customGenerator: MockContentGenerator;
  let agent: CustomLLMAgent;

  beforeEach(() => {
    geminiGenerator = new MockContentGenerator(false, UserTierId.FREE);
    customGenerator = new MockContentGenerator(false, UserTierId.STANDARD);
    agent = new CustomLLMAgent(geminiGenerator, customGenerator);
  });

  describe('构造函数', () => {
    it('应该正确初始化代理', () => {
      expect(agent).toBeInstanceOf(CustomLLMAgent);
    });

    it('应该在没有自定义LLM时也能工作', () => {
      const agentWithoutCustom = new CustomLLMAgent(geminiGenerator);
      expect(agentWithoutCustom).toBeInstanceOf(CustomLLMAgent);
    });
  });

  describe('generateContent', () => {
    it('应该优先使用自定义LLM', async () => {
      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const result = await agent.generateContent(request, 'test-prompt-id');

      expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Mock response',
      );
    });

    it('应该在自定义LLM失败时回退到Gemini', async () => {
      const failingCustomGenerator = new MockContentGenerator(true);
      const agent = new CustomLLMAgent(geminiGenerator, failingCustomGenerator);

      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await agent.generateContent(request, 'test-prompt-id');

      expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Mock response',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('自定义LLM调用失败，回退到Gemini'),
      );

      consoleSpy.mockRestore();
    });

    it('应该在没有自定义LLM时直接使用Gemini', async () => {
      const agentWithoutCustom = new CustomLLMAgent(geminiGenerator);

      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const result = await agentWithoutCustom.generateContent(
        request,
        'test-prompt-id',
      );

      expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Mock response',
      );
    });
  });

  describe('generateContentStream', () => {
    it('应该优先使用自定义LLM流式响应', async () => {
      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const stream = await agent.generateContentStream(
        request,
        'test-prompt-id',
      );
      const results: GenerateContentResponse[] = [];

      for await (const response of stream) {
        results.push(response);
      }

      expect(results).toHaveLength(2);
      expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Mock',
      );
      expect(results[1].candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        ' stream',
      );
    });

    it('应该在自定义LLM流式响应失败时回退到Gemini', async () => {
      const failingCustomGenerator = new MockContentGenerator(true);
      const agent = new CustomLLMAgent(geminiGenerator, failingCustomGenerator);

      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const stream = await agent.generateContentStream(
        request,
        'test-prompt-id',
      );
      const results: GenerateContentResponse[] = [];

      for await (const response of stream) {
        results.push(response);
      }

      expect(results).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('自定义LLM调用失败，回退到Gemini'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('countTokens', () => {
    it('应该优先使用自定义LLM', async () => {
      const request: CountTokensParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello world' }],
          },
        ],
      };

      const result = await agent.countTokens(request);

      expect(result.totalTokens).toBe(10);
    });

    it('应该在自定义LLM失败时回退到Gemini', async () => {
      const failingCustomGenerator = new MockContentGenerator(true);
      const agent = new CustomLLMAgent(geminiGenerator, failingCustomGenerator);

      const request: CountTokensParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello world' }],
          },
        ],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await agent.countTokens(request);

      expect(result.totalTokens).toBe(10);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('自定义LLM调用失败，回退到Gemini'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('embedContent', () => {
    it('应该优先使用自定义LLM', async () => {
      const request: EmbedContentParameters = {
        model: 'test-model',
        contents: [{ text: 'Hello world' }],
      };

      const result = await agent.embedContent(request);

      expect(result.embeddings?.[0]?.values).toEqual([0.1, 0.2, 0.3]);
    });

    it('应该在自定义LLM失败时回退到Gemini', async () => {
      const failingCustomGenerator = new MockContentGenerator(true);
      const agent = new CustomLLMAgent(geminiGenerator, failingCustomGenerator);

      const request: EmbedContentParameters = {
        model: 'test-model',
        contents: [{ text: 'Hello world' }],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await agent.embedContent(request);

      expect(result.embeddings?.[0]?.values).toEqual([0.1, 0.2, 0.3]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('自定义LLM调用失败，回退到Gemini'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('userTier', () => {
    it('应该优先返回自定义LLM的userTier', () => {
      expect(agent.userTier).toBe(UserTierId.STANDARD);
    });

    it('应该在没有自定义LLM时返回Gemini的userTier', () => {
      const agentWithoutCustom = new CustomLLMAgent(geminiGenerator);
      expect(agentWithoutCustom.userTier).toBe(UserTierId.FREE);
    });

    it('应该在没有userTier时返回undefined', () => {
      const geminiWithoutTier = new MockContentGenerator(false, undefined);
      const customWithoutTier = new MockContentGenerator(false, undefined);
      const agent = new CustomLLMAgent(geminiWithoutTier, customWithoutTier);

      expect(agent.userTier).toBeUndefined();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理非Error类型的异常', async () => {
      const customGenerator = {
        generateContent: vi.fn().mockRejectedValue('String error'),
      } as unknown as ContentGenerator;

      const agent = new CustomLLMAgent(geminiGenerator, customGenerator);

      const request: GenerateContentParameters = {
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await agent.generateContent(request, 'test-prompt-id');

      expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
        'Mock response',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '自定义LLM调用失败，回退到Gemini: String error',
        ),
      );

      consoleSpy.mockRestore();
    });
  });
});
