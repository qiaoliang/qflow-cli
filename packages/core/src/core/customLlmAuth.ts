/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * 自定义LLM配置接口
 */
export interface CustomLlmConfig {
  /** API密钥 */
  apiKey: string;
  /** API端点URL */
  endpoint: string;
  /** 模型名称 */
  modelName: string;
  /** 温度参数，控制生成内容的随机性 */
  temperature?: number;
  /** 最大token数 */
  maxTokens?: number;
  /** Top-p参数，控制核采样 */
  topP?: number;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 是否启用流式响应 */
  streamEnabled?: boolean;
}

/**
 * 默认的自定义LLM配置
 */
const DEFAULT_CUSTOM_LLM_CONFIG: Partial<CustomLlmConfig> = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  timeout: 30000,
  retries: 3,
  streamEnabled: true,
};

/**
 * 从环境变量加载自定义LLM配置
 * @returns 自定义LLM配置对象，如果配置不完整则返回null
 */
export function loadCustomLlmConfig(): CustomLlmConfig | null {
  const apiKey = process.env['TIE_API_KEY'];
  const endpoint = process.env['TIE_ENDPOINT'];
  const modelName = process.env['TIE_MODEL_NAME'];

  // 检查必需字段
  if (!apiKey || !endpoint || !modelName) {
    return null;
  }

  // 验证endpoint是否为有效URL
  try {
    new URL(endpoint);
  } catch {
    throw new Error('TIE_ENDPOINT must be a valid URL');
  }

  // 解析可选的数值配置
  const temperature = process.env['CUSTOM_LLM_TEMPERATURE']
    ? parseFloat(process.env['CUSTOM_LLM_TEMPERATURE'])
    : DEFAULT_CUSTOM_LLM_CONFIG.temperature;

  const maxTokens = process.env['CUSTOM_LLM_MAX_TOKENS']
    ? parseInt(process.env['CUSTOM_LLM_MAX_TOKENS'], 10)
    : DEFAULT_CUSTOM_LLM_CONFIG.maxTokens;

  const topP = process.env['CUSTOM_LLM_TOP_P']
    ? parseFloat(process.env['CUSTOM_LLM_TOP_P'])
    : DEFAULT_CUSTOM_LLM_CONFIG.topP;

  const timeout = process.env['CUSTOM_LLM_TIMEOUT']
    ? parseInt(process.env['CUSTOM_LLM_TIMEOUT'], 10)
    : DEFAULT_CUSTOM_LLM_CONFIG.timeout;

  const retries = process.env['CUSTOM_LLM_RETRIES']
    ? parseInt(process.env['CUSTOM_LLM_RETRIES'], 10)
    : DEFAULT_CUSTOM_LLM_CONFIG.retries;

  const streamEnabled = process.env['CUSTOM_LLM_STREAM_ENABLED']
    ? process.env['CUSTOM_LLM_STREAM_ENABLED'].toLowerCase() === 'true'
    : DEFAULT_CUSTOM_LLM_CONFIG.streamEnabled;

  // 验证数值范围
  if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
    throw new Error('CUSTOM_LLM_TEMPERATURE must be between 0 and 2');
  }

  if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 100000)) {
    throw new Error('CUSTOM_LLM_MAX_TOKENS must be between 1 and 100000');
  }

  if (topP !== undefined && (topP < 0 || topP > 1)) {
    throw new Error('CUSTOM_LLM_TOP_P must be between 0 and 1');
  }

  if (timeout !== undefined && timeout < 1000) {
    throw new Error('CUSTOM_LLM_TIMEOUT must be at least 1000ms');
  }

  if (retries !== undefined && (retries < 0 || retries > 10)) {
    throw new Error('CUSTOM_LLM_RETRIES must be between 0 and 10');
  }

  return {
    apiKey,
    endpoint,
    modelName,
    temperature,
    maxTokens,
    topP,
    timeout,
    retries,
    streamEnabled,
  };
}

/**
 * 检查是否应该使用自定义LLM
 * @returns 如果自定义LLM配置完整且可用则返回true
 */
export function shouldUseCustomLlm(): boolean {
  try {
    const config = loadCustomLlmConfig();
    return config !== null;
  } catch (_error) {
    // 如果配置有错误，不使用自定义LLM
    return false;
  }
}

/**
 * 验证自定义LLM配置的完整性
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateCustomLlmConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const apiKey = process.env['TIE_API_KEY'];
  const endpoint = process.env['TIE_ENDPOINT'];
  const modelName = process.env['TIE_MODEL_NAME'];

  if (!apiKey) {
    errors.push('TIE_API_KEY is required');
  }

  if (!endpoint) {
    errors.push('TIE_ENDPOINT is required');
  } else {
    try {
      new URL(endpoint);
    } catch {
      errors.push('TIE_ENDPOINT must be a valid URL');
    }
  }

  if (!modelName) {
    errors.push('TIE_MODEL_NAME is required');
  }

  // 验证可选参数
  const temperature = process.env['CUSTOM_LLM_TEMPERATURE'];
  if (temperature !== undefined) {
    const temp = parseFloat(temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      errors.push('CUSTOM_LLM_TEMPERATURE must be a number between 0 and 2');
    }
  }

  const maxTokens = process.env['CUSTOM_LLM_MAX_TOKENS'];
  if (maxTokens !== undefined) {
    const tokens = parseInt(maxTokens, 10);
    if (isNaN(tokens) || tokens < 1 || tokens > 100000) {
      errors.push(
        'CUSTOM_LLM_MAX_TOKENS must be a number between 1 and 100000',
      );
    }
  }

  const topP = process.env['CUSTOM_LLM_TOP_P'];
  if (topP !== undefined) {
    const p = parseFloat(topP);
    if (isNaN(p) || p < 0 || p > 1) {
      errors.push('CUSTOM_LLM_TOP_P must be a number between 0 and 1');
    }
  }

  const timeout = process.env['CUSTOM_LLM_TIMEOUT'];
  if (timeout !== undefined) {
    const t = parseInt(timeout, 10);
    if (isNaN(t) || t < 1000) {
      errors.push('CUSTOM_LLM_TIMEOUT must be a number >= 1000');
    }
  }

  const retries = process.env['CUSTOM_LLM_RETRIES'];
  if (retries !== undefined) {
    const r = parseInt(retries, 10);
    if (isNaN(r) || r < 0 || r > 10) {
      errors.push('CUSTOM_LLM_RETRIES must be a number between 0 and 10');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 将自定义LLM配置写入 .tie/.env 文件
 * @param config 自定义LLM配置
 * @param workspaceDir 工作目录，默认为当前工作目录
 * @returns 写入是否成功
 */
export function writeCustomLlmConfigToEnvFile(
  config: CustomLlmConfig,
  workspaceDir: string = process.cwd(),
): boolean {
  try {
    const tieDir = path.join(workspaceDir, '.tie');
    const envFilePath = path.join(tieDir, '.env');

    // 确保 .tie 目录存在
    if (!fs.existsSync(tieDir)) {
      fs.mkdirSync(tieDir, { recursive: true });
    }

    // 读取现有的 .env 文件内容（如果存在）
    let existingContent = '';
    if (fs.existsSync(envFilePath)) {
      existingContent = fs.readFileSync(envFilePath, 'utf-8');
    }

    // 解析现有的环境变量
    const existingEnvVars: Record<string, string> = {};
    if (existingContent) {
      const lines = existingContent.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const equalIndex = trimmedLine.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            existingEnvVars[key] = value;
          }
        }
      }
    }

    // 更新自定义LLM相关的环境变量
    existingEnvVars['TIE_API_KEY'] = config.apiKey;
    existingEnvVars['TIE_ENDPOINT'] = config.endpoint;
    existingEnvVars['TIE_MODEL_NAME'] = config.modelName;

    // 如果有其他可选配置，也写入
    if (config.temperature !== undefined) {
      existingEnvVars['CUSTOM_LLM_TEMPERATURE'] = config.temperature.toString();
    }
    if (config.maxTokens !== undefined) {
      existingEnvVars['CUSTOM_LLM_MAX_TOKENS'] = config.maxTokens.toString();
    }
    if (config.topP !== undefined) {
      existingEnvVars['CUSTOM_LLM_TOP_P'] = config.topP.toString();
    }
    if (config.timeout !== undefined) {
      existingEnvVars['CUSTOM_LLM_TIMEOUT'] = config.timeout.toString();
    }
    if (config.retries !== undefined) {
      existingEnvVars['CUSTOM_LLM_RETRIES'] = config.retries.toString();
    }
    if (config.streamEnabled !== undefined) {
      existingEnvVars['CUSTOM_LLM_STREAM_ENABLED'] =
        config.streamEnabled.toString();
    }

    // 生成新的 .env 文件内容
    const newContent =
      Object.entries(existingEnvVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n';

    // 写入文件
    fs.writeFileSync(envFilePath, newContent, 'utf-8');

    return true;
  } catch (error) {
    console.error('Error writing custom LLM config to .env file:', error);
    return false;
  }
}
