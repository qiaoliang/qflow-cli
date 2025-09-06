/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '@tiecode/tie-cli-core';
import { vi } from 'vitest';
import { validateAuthMethod } from './auth.js';

vi.mock('./settings.js', () => ({
  loadEnvironment: vi.fn(),
  loadSettings: vi.fn().mockReturnValue({
    merged: vi.fn().mockReturnValue({}),
  }),
}));

describe('validateAuthMethod', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('GEMINI_API_KEY', undefined);
    vi.stubEnv('GOOGLE_CLOUD_PROJECT', undefined);
    vi.stubEnv('GOOGLE_CLOUD_LOCATION', undefined);
    vi.stubEnv('GOOGLE_API_KEY', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return null for LOGIN_WITH_GOOGLE', async () => {
    expect(await validateAuthMethod(AuthType.LOGIN_WITH_GOOGLE)).toBeNull();
  });

  it('should return null for CLOUD_SHELL', async () => {
    expect(await validateAuthMethod(AuthType.CLOUD_SHELL)).toBeNull();
  });

  describe('USE_GEMINI', () => {
    it('should return null if GEMINI_API_KEY is set', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test-key');
      expect(await validateAuthMethod(AuthType.USE_GEMINI)).toBeNull();
    });

    it('should return an error message if GEMINI_API_KEY is not set', async () => {
      vi.stubEnv('GEMINI_API_KEY', undefined);
      expect(await validateAuthMethod(AuthType.USE_GEMINI)).toBe(
        'GEMINI_API_KEY environment variable not found. Add that to your environment and try again (no reload needed if using .env)!',
      );
    });
  });

  describe('USE_VERTEX_AI', () => {
    it('should return null if GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are set', async () => {
      vi.stubEnv('GOOGLE_CLOUD_PROJECT', 'test-project');
      vi.stubEnv('GOOGLE_CLOUD_LOCATION', 'test-location');
      expect(await validateAuthMethod(AuthType.USE_VERTEX_AI)).toBeNull();
    });

    it('should return null if GOOGLE_API_KEY is set', async () => {
      vi.stubEnv('GOOGLE_API_KEY', 'test-api-key');
      expect(await validateAuthMethod(AuthType.USE_VERTEX_AI)).toBeNull();
    });

    it('should return an error message if no required environment variables are set', async () => {
      vi.stubEnv('GOOGLE_CLOUD_PROJECT', undefined);
      vi.stubEnv('GOOGLE_CLOUD_LOCATION', undefined);
      expect(await validateAuthMethod(AuthType.USE_VERTEX_AI)).toBe(
        'When using Vertex AI, you must specify either:\n' +
          '• GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION environment variables.\n' +
          '• GOOGLE_API_KEY environment variable (if using express mode).\n' +
          'Update your environment and try again (no reload needed if using .env)!',
      );
    });
  });

  describe('CUSTOM_LLM', () => {
    beforeEach(() => {
      vi.stubEnv('TIE_API_KEY', undefined);
      vi.stubEnv('TIE_ENDPOINT', undefined);
      vi.stubEnv('TIE_MODEL_NAME', undefined);
    });

    it('should return null if all required custom LLM environment variables are set', async () => {
      vi.stubEnv('TIE_API_KEY', 'test-api-key');
      vi.stubEnv('TIE_ENDPOINT', 'https://api.example.com');
      vi.stubEnv('TIE_MODEL_NAME', 'test-model');
      expect(await validateAuthMethod(AuthType.CUSTOM_LLM)).toBeNull();
    });

    it('should return error message if TIE_API_KEY is missing', async () => {
      vi.stubEnv('TIE_ENDPOINT', 'https://api.example.com');
      vi.stubEnv('TIE_MODEL_NAME', 'test-model');
      const result = await validateAuthMethod(AuthType.CUSTOM_LLM);
      expect(result).toContain('TIE_API_KEY is required');
    });

    it('should return error message if TIE_ENDPOINT is missing', async () => {
      vi.stubEnv('TIE_API_KEY', 'test-api-key');
      vi.stubEnv('TIE_MODEL_NAME', 'test-model');
      const result = await validateAuthMethod(AuthType.CUSTOM_LLM);
      expect(result).toContain('TIE_ENDPOINT is required');
    });

    it('should return error message if TIE_MODEL_NAME is missing', async () => {
      vi.stubEnv('TIE_API_KEY', 'test-api-key');
      vi.stubEnv('TIE_ENDPOINT', 'https://api.example.com');
      const result = await validateAuthMethod(AuthType.CUSTOM_LLM);
      expect(result).toContain('TIE_MODEL_NAME is required');
    });

    it('should return error message if TIE_ENDPOINT is invalid URL', async () => {
      vi.stubEnv('TIE_API_KEY', 'test-api-key');
      vi.stubEnv('TIE_ENDPOINT', 'invalid-url');
      vi.stubEnv('TIE_MODEL_NAME', 'test-model');
      const result = await validateAuthMethod(AuthType.CUSTOM_LLM);
      expect(result).toContain('TIE_ENDPOINT must be a valid URL');
    });
  });

  it('should return an error message for an invalid auth method', async () => {
    expect(await validateAuthMethod('invalid-method')).toBe(
      'Invalid auth method selected.',
    );
  });
});
