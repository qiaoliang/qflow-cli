/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '@google/gemini-cli-core';
import { AuthType } from '@google/gemini-cli-core';
import { USER_SETTINGS_PATH } from './config/settings.js';
import { validateAuthMethod } from './config/auth.js';
import { type LoadedSettings } from './config/settings.js';

function getAuthTypeFromEnv(): AuthType | undefined {
  // 1. 优先检查自定义LLM配置
  if (
    process.env['CUSTOM_LLM_API_KEY'] &&
    process.env['CUSTOM_LLM_ENDPOINT'] &&
    process.env['CUSTOM_LLM_MODEL_NAME']
  ) {
    return AuthType.CUSTOM_LLM;
  }

  // 2. 检查Gemini API Key
  if (process.env['GEMINI_API_KEY']) {
    return AuthType.USE_GEMINI;
  }

  // 3. 检查Google Cloud配置
  if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
    return AuthType.USE_VERTEX_AI;
  }

  // 4. 检查Google OAuth
  if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
    return AuthType.LOGIN_WITH_GOOGLE;
  }

  return undefined;
}

export async function validateNonInteractiveAuth(
  configuredAuthType: AuthType | undefined,
  useExternalAuth: boolean | undefined,
  nonInteractiveConfig: Config,
  settings: LoadedSettings,
) {
  const enforcedType = settings.merged.security?.auth?.enforcedType;
  if (enforcedType) {
    const currentAuthType = getAuthTypeFromEnv();
    if (currentAuthType !== enforcedType) {
      console.error(
        `The configured auth type is ${enforcedType}, but the current auth type is ${currentAuthType}. Please re-authenticate with the correct type.`,
      );
      process.exit(1);
    }
  }

  const effectiveAuthType =
    enforcedType || getAuthTypeFromEnv() || configuredAuthType;

  if (!effectiveAuthType) {
    console.error(
      `Please set an Auth method in your ${USER_SETTINGS_PATH} or specify one of the following environment variables before running: CUSTOM_LLM_API_KEY+CUSTOM_LLM_ENDPOINT+CUSTOM_LLM_MODEL_NAME, GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA`,
    );
    process.exit(1);
  }

  if (!useExternalAuth) {
    const err = await validateAuthMethod(effectiveAuthType);
    if (err != null) {
      console.error(err);
      process.exit(1);
    }
  }

  await nonInteractiveConfig.refreshAuth(effectiveAuthType);
  return nonInteractiveConfig;
}
