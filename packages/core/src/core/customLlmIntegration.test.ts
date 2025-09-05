/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createContentGenerator, AuthType } from './contentGenerator.js';
import { Config } from '../config/config.js';

describe('CustomLLM Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
    // 清理环境变量
    delete process.env['CUSTOM_LLM_API_KEY'];
    delete process.env['CUSTOM_LLM_ENDPOINT'];
    delete process.env['CUSTOM_LLM_MODEL_NAME'];
    delete process.env['GEMINI_API_KEY'];
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  it('应该在没有自定义LLM配置时使用Gemini', async () => {
    // 设置Gemini API Key
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是LoggingContentGenerator包装的Gemini生成器
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('LoggingContentGenerator');
  });

  it('应该在配置了自定义LLM时使用CustomLLMAgent', async () => {
    // 设置自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    // 设置Gemini API Key作为回退
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });

  it('应该在自定义LLM配置不完整时回退到Gemini', async () => {
    // 只设置部分自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    // 缺少ENDPOINT和MODEL_NAME

    // 设置Gemini API Key
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证回退到Gemini
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('LoggingContentGenerator');
  });

  it('应该在自定义LLM配置无效时回退到Gemini', async () => {
    // 设置无效的自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'invalid-url';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    // 设置Gemini API Key
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证回退到Gemini
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('LoggingContentGenerator');
  });

  it('应该支持自定义LLM的默认配置值', async () => {
    // 只设置必需字段
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    // 设置Gemini API Key作为回退
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });

  it('应该支持自定义LLM的自定义配置值', async () => {
    // 设置完整的自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';
    process.env['CUSTOM_LLM_TEMPERATURE'] = '0.5';
    process.env['CUSTOM_LLM_MAX_TOKENS'] = '2048';
    process.env['CUSTOM_LLM_TOP_P'] = '0.8';
    process.env['CUSTOM_LLM_TIMEOUT'] = '60000';
    process.env['CUSTOM_LLM_RETRIES'] = '5';
    process.env['CUSTOM_LLM_STREAM_ENABLED'] = 'false';

    // 设置Gemini API Key作为回退
    process.env['GEMINI_API_KEY'] = 'test-gemini-key';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_GEMINI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });

  it('应该支持OAuth认证方式', async () => {
    // 设置自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.LOGIN_WITH_GOOGLE,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });

  it('应该支持Cloud Shell认证方式', async () => {
    // 设置自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.CLOUD_SHELL,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });

  it('应该支持Vertex AI认证方式', async () => {
    // 设置自定义LLM配置
    process.env['CUSTOM_LLM_API_KEY'] = 'test-custom-key';
    process.env['CUSTOM_LLM_ENDPOINT'] = 'https://api.example.com';
    process.env['CUSTOM_LLM_MODEL_NAME'] = 'gpt-3.5-turbo';

    // 设置Vertex AI配置
    process.env['GOOGLE_CLOUD_PROJECT'] = 'test-project';
    process.env['GOOGLE_CLOUD_LOCATION'] = 'us-central1';

    const config = {
      model: 'gemini-1.5-flash',
      authType: AuthType.USE_VERTEX_AI,
    };

    const gcConfig = new Config({
      cwd: '/tmp',
      model: 'gemini-1.5-flash',
      sessionId: 'test-session',
      targetDir: '/tmp',
      debugMode: false,
    });

    const generator = await createContentGenerator(config, gcConfig);

    // 验证返回的是CustomLLMAgent
    expect(generator).toBeDefined();
    expect(generator.constructor.name).toBe('CustomLLMAgent');
  });
});
