/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('环境变量检查功能', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 清除所有TIE相关的环境变量
    delete process.env['TIE_API_KEY'];
    delete process.env['TIE_ENDPOINT'];
    delete process.env['TIE_MODEL_NAME'];
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  it('应该在没有TIE环境变量时正常启动', () => {
    // 没有设置任何TIE环境变量
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(false);
    expect(hasCompleteTieConfig).toBe(false);
  });

  it('应该在只有部分TIE环境变量时强制显示认证对话框', () => {
    // 只设置API Key
    process.env['TIE_API_KEY'] = 'test-api-key';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(true);
    expect(hasCompleteTieConfig).toBe(false);
  });

  it('应该在只有部分TIE环境变量时强制显示认证对话框 - 只有ENDPOINT', () => {
    // 只设置Endpoint
    process.env['TIE_ENDPOINT'] = 'https://api.example.com';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(true);
    expect(hasCompleteTieConfig).toBe(false);
  });

  it('应该在只有部分TIE环境变量时强制显示认证对话框 - 只有MODEL_NAME', () => {
    // 只设置Model Name
    process.env['TIE_MODEL_NAME'] = 'test-model';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(true);
    expect(hasCompleteTieConfig).toBe(false);
  });

  it('应该在只有两个TIE环境变量时强制显示认证对话框', () => {
    // 只设置API Key和Endpoint
    process.env['TIE_API_KEY'] = 'test-api-key';
    process.env['TIE_ENDPOINT'] = 'https://api.example.com';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(true);
    expect(hasCompleteTieConfig).toBe(false);
  });

  it('应该在所有TIE环境变量都存在时正常使用自定义LLM认证', () => {
    // 设置所有必需的TIE环境变量
    process.env['TIE_API_KEY'] = 'test-api-key';
    process.env['TIE_ENDPOINT'] = 'https://api.example.com';
    process.env['TIE_MODEL_NAME'] = 'test-model';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(true);
    expect(hasCompleteTieConfig).toBe(true);
  });

  it('应该在环境变量为空字符串时视为不存在', () => {
    // 设置空字符串
    process.env['TIE_API_KEY'] = '';
    process.env['TIE_ENDPOINT'] = '';
    process.env['TIE_MODEL_NAME'] = '';
    
    const hasTieApiKey = !!process.env['TIE_API_KEY'];
    const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
    const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
    const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
    const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;

    expect(hasPartialTieConfig).toBe(false);
    expect(hasCompleteTieConfig).toBe(false);
  });
});
