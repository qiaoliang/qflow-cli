/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { FinishReason } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { CustomLlmConfig } from './customLlmAuth.js';
import type { UserTierId } from '../code_assist/types.js';

/**
 * OpenAI API请求格式
 */
interface OpenAIRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * OpenAI API响应格式
 */
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI流式响应格式
 */
interface OpenAIStreamResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason?: string;
  }>;
}

/**
 * OpenAI兼容的ContentGenerator实现
 */
export class OpenAIContentGenerator implements ContentGenerator {
  private config: CustomLlmConfig;
  private baseUrl: string;

  constructor(config: CustomLlmConfig) {
    this.config = config;
    // 确保端点格式正确，如果已经包含/v1则不再添加
    this.baseUrl = config.endpoint.replace(/\/$/, ''); // 移除末尾的斜杠
    if (!this.baseUrl.endsWith('/v1')) {
      this.baseUrl = this.baseUrl + '/v1';
    }
  }

  /**
   * 生成内容
   */
  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const openAIRequest = this.convertToOpenAIRequest(request);

    try {
      const response = await this.makeRequest(
        '/chat/completions',
        openAIRequest,
      );
      return this.convertFromOpenAIResponse(response);
    } catch (error) {
      throw new Error(
        `OpenAI API调用失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 生成流式内容
   */
  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const openAIRequest = {
      ...this.convertToOpenAIRequest(request),
      stream: true,
    };

    return this.createStreamGenerator(openAIRequest);
  }

  /**
   * 创建流式生成器
   */
  private async *createStreamGenerator(
    openAIRequest: OpenAIRequest,
  ): AsyncGenerator<GenerateContentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(openAIRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }

              try {
                const parsed: OpenAIStreamResponse = JSON.parse(data);
                const geminiResponse =
                  this.convertFromOpenAIStreamResponse(parsed);

                // 只有当响应有有效内容时才yield
                if (
                  geminiResponse.candidates &&
                  geminiResponse.candidates.length > 0 &&
                  geminiResponse.candidates[0]?.content
                ) {
                  const content = geminiResponse.candidates[0].content;
                  const candidate = geminiResponse.candidates[0];

                  // 有文本内容、functionCall、或者finishReason时才yield
                  if (
                    (content.parts && content.parts.length > 0) ||
                    (geminiResponse.functionCalls &&
                      geminiResponse.functionCalls.length > 0) ||
                    candidate.finishReason
                  ) {
                    yield geminiResponse;
                  }
                }
              } catch (parseError) {
                // 忽略解析错误，继续处理下一行
                console.warn('解析流式响应失败:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new Error(
        `OpenAI流式API调用失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 计算token数量
   */
  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // OpenAI没有直接的token计算API，这里使用简单的估算
    // 实际项目中可能需要使用tiktoken库进行精确计算
    const text = this.extractTextFromRequest(request);
    const estimatedTokens = Math.ceil(text.length / 4); // 粗略估算：4个字符约等于1个token

    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * 嵌入内容（OpenAI不支持，抛出错误）
   */
  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error('OpenAI ContentGenerator不支持嵌入功能');
  }

  /**
   * 用户层级（OpenAI不支持）
   */
  userTier?: UserTierId;

  /**
   * 将Gemini请求转换为OpenAI格式
   */
  private convertToOpenAIRequest(
    request: GenerateContentParameters,
  ): OpenAIRequest {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

    // 处理系统指令
    if (request.config?.systemInstruction) {
      const systemInstruction = request.config.systemInstruction;
      messages.push({
        role: 'system',
        content: this.extractTextFromContent(systemInstruction),
      });
    }

    // 处理内容部分
    if (request.contents) {
      const contentsArray = Array.isArray(request.contents)
        ? request.contents
        : [request.contents];
      for (const content of contentsArray) {
        if (typeof content === 'object' && 'role' in content) {
          if (content.role === 'user') {
            const userContent = this.extractTextFromContent(content);
            messages.push({ role: 'user', content: userContent });
          } else if (content.role === 'model') {
            const modelContent = this.extractTextFromContent(content);
            messages.push({ role: 'assistant', content: modelContent });
          }
        }
      }
    }

    return {
      model: this.config.modelName,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
    };
  }

  /**
   * 将OpenAI响应转换为Gemini格式
   */
  private convertFromOpenAIResponse(
    response: OpenAIResponse,
  ): GenerateContentResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error('OpenAI响应中没有选择项');
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              {
                text: choice.message.content,
              },
            ],
          },
          finishReason: this.convertFinishReason(choice.finish_reason),
          index: choice.index,
        },
      ],
      text: choice.message.content,
      data: '',
      functionCalls: [],
      executableCode: '',
      codeExecutionResult: '',
      usageMetadata: {
        promptTokenCount: response.usage.prompt_tokens,
        candidatesTokenCount: response.usage.completion_tokens,
        totalTokenCount: response.usage.total_tokens,
      },
    };
  }

  /**
   * 将OpenAI流式响应转换为Gemini格式
   */
  private convertFromOpenAIStreamResponse(
    response: OpenAIStreamResponse,
  ): GenerateContentResponse {
    const choice = response.choices[0];
    if (!choice) {
      return {
        candidates: [],
        text: '',
        data: '',
        functionCalls: [],
        executableCode: '',
        codeExecutionResult: '',
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        },
      };
    }

    const text = choice.delta.content || '';
    const functionCall = choice.delta.function_call;

    // 构建parts数组
    const parts: Array<{
      text?: string;
      functionCall?: { name: string; args: Record<string, unknown> };
    }> = [];

    // 添加文本内容
    if (text) {
      parts.push({ text });
    }

    // 添加function call
    if (functionCall) {
      parts.push({
        functionCall: {
          name: functionCall.name || '',
          args: functionCall.arguments
            ? JSON.parse(functionCall.arguments)
            : {},
        },
      });
    }

    // 如果没有内容且没有finish_reason，跳过这个chunk
    if (parts.length === 0 && !choice.finish_reason) {
      return {
        candidates: [],
        text: '',
        data: '',
        functionCalls: [],
        executableCode: '',
        codeExecutionResult: '',
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
        },
      };
    }

    return {
      candidates: [
        {
          content: {
            role: 'model',
            parts,
          },
          finishReason: choice.finish_reason
            ? this.convertFinishReason(choice.finish_reason)
            : undefined,
          index: choice.index,
        },
      ],
      text,
      data: '',
      functionCalls: functionCall
        ? [
            {
              name: functionCall.name || '',
              args: functionCall.arguments
                ? JSON.parse(functionCall.arguments)
                : {},
            },
          ]
        : [],
      executableCode: '',
      codeExecutionResult: '',
      usageMetadata: {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      },
    };
  }

  /**
   * 转换完成原因
   */
  private convertFinishReason(reason: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'content_filter':
        return FinishReason.SAFETY;
      default:
        return FinishReason.OTHER;
    }
  }

  /**
   * 从内容中提取文本
   */
  private extractTextFromContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (
      typeof content === 'object' &&
      content !== null &&
      'parts' in content &&
      Array.isArray((content as { parts: unknown[] }).parts)
    ) {
      return (content as { parts: Array<{ text?: string }> }).parts
        .map((part) => part.text || '')
        .join('');
    }

    return '';
  }

  /**
   * 从请求中提取文本内容
   */
  private extractTextFromRequest(request: CountTokensParameters): string {
    let text = '';

    if (request.contents) {
      const contentsArray = Array.isArray(request.contents)
        ? request.contents
        : [request.contents];
      for (const content of contentsArray) {
        text += this.extractTextFromContent(content);
      }
    }

    return text;
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(
    endpoint: string,
    data: OpenAIRequest,
  ): Promise<OpenAIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}\n${errorText}`,
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时 (${this.config.timeout}ms)`);
      }
      throw error;
    }
  }
}
