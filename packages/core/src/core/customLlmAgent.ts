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
import type { ContentGenerator } from './contentGenerator.js';
import type { UserTierId } from '../code_assist/types.js';

/**
 * 自定义LLM代理类，实现装饰器模式
 *
 * 优先使用自定义LLM；如果已配置自定义LLM且调用失败，则直接抛错，不回退到Gemini
 * 保持所有现有功能和接口不变
 */
export class CustomLLMAgent implements ContentGenerator {
  private readonly geminiGenerator: ContentGenerator;
  private readonly customGenerator?: ContentGenerator;

  constructor(
    geminiGenerator: ContentGenerator,
    customGenerator?: ContentGenerator,
  ) {
    this.geminiGenerator = geminiGenerator;
    this.customGenerator = customGenerator;
  }

  /**
   * 生成内容，优先使用自定义LLM（失败不回退到Gemini）
   */
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    return this.tryCustomLlm(
      () => this.customGenerator!.generateContent(request, userPromptId),
      () => this.geminiGenerator.generateContent(request, userPromptId),
    );
  }

  /**
   * 生成流式内容，优先使用自定义LLM（失败不回退到Gemini）
   */
  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.tryCustomLlm(
      () => this.customGenerator!.generateContentStream(request, userPromptId),
      () => this.geminiGenerator.generateContentStream(request, userPromptId),
    );
  }

  /**
   * 计算token数量，优先使用自定义LLM（失败不回退到Gemini）
   */
  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    return this.tryCustomLlm(
      () => this.customGenerator!.countTokens(request),
      () => this.geminiGenerator.countTokens(request),
    );
  }

  /**
   * 嵌入内容，优先使用自定义LLM（失败不回退到Gemini）
   */
  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    return this.tryCustomLlm(
      () => this.customGenerator!.embedContent(request),
      () => this.geminiGenerator.embedContent(request),
    );
  }

  /**
   * 用户层级，优先使用自定义LLM的层级，否则使用Gemini的层级
   */
  get userTier(): UserTierId | undefined {
    return this.customGenerator?.userTier ?? this.geminiGenerator.userTier;
  }

  /**
   * 尝试使用自定义LLM。
   * - 若未配置自定义LLM，则使用Gemini。
   * - 若已配置自定义LLM且调用失败：直接抛错，不回退到Gemini。
   *
   * @param customOperation 自定义LLM操作
   * @param fallbackOperation Gemini操作（仅在未配置自定义LLM时使用）
   * @returns 操作结果
   */
  private async tryCustomLlm<T>(
    customOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    // 如果没有配置自定义LLM，直接使用Gemini
    if (!this.customGenerator) {
      return fallbackOperation();
    }

    try {
      // 尝试使用自定义LLM
      return await customOperation();
    } catch (error) {
      // 记录错误日志并抛出，不回退到Gemini
      const message = `自定义LLM调用失败：${error instanceof Error ? error.message : String(error)}`;
      console.warn(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
