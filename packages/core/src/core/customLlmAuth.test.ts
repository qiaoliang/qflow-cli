/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadCustomLlmConfig,
  shouldUseCustomLlm,
  validateCustomLlmConfig,
} from './customLlmAuth.js';

describe('customLlmAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 清理环境变量
    process.env = { ...originalEnv };
    delete process.env['CUSTOM_LLM_API_KEY'];
    delete process.env['CUSTOM_LLM_ENDPOINT'];
    delete process.env['CUSTOM_LLM_MODEL_NAME'];
    delete process.env['CUSTOM_LLM_TEMPERATURE'];
    delete process.env['CUSTOM_LLM_MAX_TOKENS'];
    delete process.env['CUSTOM_LLM_TOP_P'];
    delete process.env['CUSTOM_LLM_TIMEOUT'];
    delete process.env['CUSTOM_LLM_RETRIES'];
    delete process.env['CUSTOM_LLM_STREAM_ENABLED'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadCustomLlmConfig', () => {
    it('应该返回null当必需字段缺失时', () => {
      expect(loadCustomLlmConfig()).toBeNull();
    });

    it('应该返回null当只有API_KEY时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      expect(loadCustomLlmConfig()).toBeNull();
    });

    it('应该返回null当只有ENDPOINT时', () => {
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      expect(loadCustomLlmConfig()).toBeNull();
    });

    it('应该返回null当只有MODEL_NAME时', () => {
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      expect(loadCustomLlmConfig()).toBeNull();
    });

    it('应该返回完整配置当所有必需字段都存在时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

      const config = loadCustomLlmConfig();
      expect(config).toEqual({
        apiKey: 'test-key',
        endpoint: 'https://api.example.com',
        modelName: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
        timeout: 30000,
        retries: 3,
        streamEnabled: true,
      });
    });

    it('应该使用自定义值当环境变量设置时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TEMPERATURE'] = '0.5';
      process.env['CUSTOM_LLM_MAX_TOKENS'] = '1024';
      process.env['CUSTOM_LLM_TOP_P'] = '0.8';
      process.env['CUSTOM_LLM_TIMEOUT'] = '60000';
      process.env['CUSTOM_LLM_RETRIES'] = '5';
      process.env['CUSTOM_LLM_STREAM_ENABLED'] = 'false';

      const config = loadCustomLlmConfig();
      expect(config).toEqual({
        apiKey: 'test-key',
        endpoint: 'https://api.example.com',
        modelName: 'gpt-3.5-turbo',
        temperature: 0.5,
        maxTokens: 1024,
        topP: 0.8,
        timeout: 60000,
        retries: 5,
        streamEnabled: false,
      });
    });

    it('应该抛出错误当temperature超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TEMPERATURE'] = '3.0';

      expect(() => loadCustomLlmConfig()).toThrow(
        'CUSTOM_LLM_TEMPERATURE must be between 0 and 2',
      );
    });

    it('应该抛出错误当maxTokens超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_MAX_TOKENS'] = '200000';

      expect(() => loadCustomLlmConfig()).toThrow(
        'CUSTOM_LLM_MAX_TOKENS must be between 1 and 100000',
      );
    });

    it('应该抛出错误当topP超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TOP_P'] = '1.5';

      expect(() => loadCustomLlmConfig()).toThrow(
        'CUSTOM_LLM_TOP_P must be between 0 and 1',
      );
    });

    it('应该抛出错误当timeout太小时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TIMEOUT'] = '500';

      expect(() => loadCustomLlmConfig()).toThrow(
        'CUSTOM_LLM_TIMEOUT must be at least 1000ms',
      );
    });

    it('应该抛出错误当retries超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_RETRIES'] = '15';

      expect(() => loadCustomLlmConfig()).toThrow(
        'CUSTOM_LLM_RETRIES must be between 0 and 10',
      );
    });
  });

  describe('shouldUseCustomLlm', () => {
    it('应该返回false当配置不完整时', () => {
      expect(shouldUseCustomLlm()).toBe(false);
    });

    it('应该返回false当配置有错误时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'invalid-url';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

      expect(shouldUseCustomLlm()).toBe(false);
    });

    it('应该返回true当配置完整且有效时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

      expect(shouldUseCustomLlm()).toBe(true);
    });
  });

  describe('validateCustomLlmConfig', () => {
    it('应该返回无效当所有必需字段都缺失时', () => {
      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CUSTOM_LLM_API_KEY is required');
      expect(result.errors).toContain('CUSTOM_LLM_ENDPOINT is required');
      expect(result.errors).toContain('CUSTOM_LLM_MODEL_NAME is required');
    });

    it('应该返回无效当endpoint不是有效URL时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'invalid-url';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_ENDPOINT must be a valid URL',
      );
    });

    it('应该返回有效当所有必需字段都存在且有效时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该返回无效当temperature超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TEMPERATURE'] = '3.0';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_TEMPERATURE must be a number between 0 and 2',
      );
    });

    it('应该返回无效当maxTokens超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_MAX_TOKENS'] = '200000';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_MAX_TOKENS must be a number between 1 and 100000',
      );
    });

    it('应该返回无效当topP超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TOP_P'] = '1.5';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_TOP_P must be a number between 0 and 1',
      );
    });

    it('应该返回无效当timeout太小时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_TIMEOUT'] = '500';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_TIMEOUT must be a number >= 1000',
      );
    });

    it('应该返回无效当retries超出范围时', () => {
      process.env['CUSTOM_LLM_API_KEY'] = 'test-key';
      process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
      process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
      process.env['CUSTOM_LLM_RETRIES'] = '15';

      const result = validateCustomLlmConfig();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'CUSTOM_LLM_RETRIES must be a number between 0 and 10',
      );
    });
  });
});
