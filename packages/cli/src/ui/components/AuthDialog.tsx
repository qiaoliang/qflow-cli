/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import { CustomLLMConfigDialog } from './CustomLLMConfigDialog.js';
import type { LoadedSettings } from '../../config/settings.js';
import { SettingScope } from '../../config/settings.js';
import { AuthType } from '@tiecode/tie-cli-core';
import { validateAuthMethod } from '../../config/auth.js';
import { useKeypress } from '../hooks/useKeypress.js';

interface AuthDialogProps {
  onSelect: (authMethod: AuthType | undefined, scope: SettingScope) => void;
  settings: LoadedSettings;
  initialErrorMessage?: string | null;
}

function parseDefaultAuthType(
  defaultAuthType: string | undefined,
): AuthType | null {
  if (
    defaultAuthType &&
    Object.values(AuthType).includes(defaultAuthType as AuthType)
  ) {
    return defaultAuthType as AuthType;
  }
  return null;
}

export function AuthDialog({
  onSelect,
  settings,
  initialErrorMessage,
}: AuthDialogProps): React.JSX.Element {
  const [showCustomLLMConfig, setShowCustomLLMConfig] = useState(false);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (initialErrorMessage) {
      return initialErrorMessage;
    }

    const defaultAuthType = parseDefaultAuthType(
      process.env['GEMINI_DEFAULT_AUTH_TYPE'],
    );

    if (process.env['GEMINI_DEFAULT_AUTH_TYPE'] && defaultAuthType === null) {
      return (
        `Invalid value for GEMINI_DEFAULT_AUTH_TYPE: "${process.env['GEMINI_DEFAULT_AUTH_TYPE']}". ` +
        `Valid values are: ${Object.values(AuthType).join(', ')}.`
      );
    }

    // 检查自定义LLM配置
    if (
      process.env['TIE_API_KEY'] &&
      process.env['TIE_ENDPOINT'] &&
      process.env['TIE_MODEL_NAME'] &&
      (!defaultAuthType || defaultAuthType === AuthType.CUSTOM_LLM)
    ) {
      return 'Custom LLM configuration detected (CUSTOM_LLM_*). Select "Custom LLM API" option to use it.';
    }

    if (
      process.env['GEMINI_API_KEY'] &&
      (!defaultAuthType || defaultAuthType === AuthType.USE_GEMINI)
    ) {
      return 'Existing API key detected (GEMINI_API_KEY). Select "Gemini API Key" option to use it.';
    }
    return null;
  });
  let items = [
    {
      label: 'Custom LLM API',
      value: AuthType.CUSTOM_LLM,
    },
    {
      label: 'Login with Google',
      value: AuthType.LOGIN_WITH_GOOGLE,
    },
    ...(process.env['CLOUD_SHELL'] === 'true'
      ? [
          {
            label: 'Use Cloud Shell user credentials',
            value: AuthType.CLOUD_SHELL,
          },
        ]
      : []),
    {
      label: 'Use Gemini API Key',
      value: AuthType.USE_GEMINI,
    },
    { label: 'Vertex AI', value: AuthType.USE_VERTEX_AI },
  ];

  if (settings.merged.security?.auth?.enforcedType) {
    items = items.filter(
      (item) => item.value === settings.merged.security?.auth?.enforcedType,
    );
  }

  let initialAuthIndex = items.findIndex((item) => {
    if (settings.merged.security?.auth?.selectedType) {
      return item.value === settings.merged.security.auth.selectedType;
    }

    const defaultAuthType = parseDefaultAuthType(
      process.env['GEMINI_DEFAULT_AUTH_TYPE'],
    );
    if (defaultAuthType) {
      return item.value === defaultAuthType;
    }

    // 优先检查自定义LLM配置
    if (
      process.env['TIE_API_KEY'] &&
      process.env['TIE_ENDPOINT'] &&
      process.env['TIE_MODEL_NAME']
    ) {
      return item.value === AuthType.CUSTOM_LLM;
    }

    if (process.env['GEMINI_API_KEY']) {
      return item.value === AuthType.USE_GEMINI;
    }

    // 不默认选择任何认证方式，让用户主动选择
    return -1;
  });
  if (settings.merged.security?.auth?.enforcedType) {
    initialAuthIndex = 0;
  } else if (initialAuthIndex === -1) {
    // 如果没有找到匹配的认证方式，默认选择第一个
    initialAuthIndex = 0;
  }

  const handleCustomLLMConfigComplete = async (config: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  }) => {
    // 设置环境变量
    process.env['TIE_API_KEY'] = config.apiKey;
    process.env['TIE_ENDPOINT'] = config.endpoint;
    process.env['TIE_MODEL_NAME'] = config.modelName;

    // 写入 .tie/.env 文件
    const { writeCustomLlmConfigToEnvFile } = await import(
      '@tiecode/tie-cli-core'
    );
    const success = writeCustomLlmConfigToEnvFile(config);
    if (!success) {
      setErrorMessage('保存配置到 .tie/.env 文件失败');
      setShowCustomLLMConfig(false);
      return;
    }

    // 验证配置
    const error = await validateAuthMethod(AuthType.CUSTOM_LLM);
    if (error) {
      setErrorMessage(error);
      setShowCustomLLMConfig(false);
    } else {
      setErrorMessage(null);
      setShowCustomLLMConfig(false);
      onSelect(AuthType.CUSTOM_LLM, SettingScope.User);
    }
  };

  const handleCustomLLMConfigSavePartial = async (config: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  }) => {
    // 写入 .tie/.env 文件
    const { writeCustomLlmConfigToEnvFile } = await import(
      '@tiecode/tie-cli-core'
    );
    const success = writeCustomLlmConfigToEnvFile(config);
    if (!success) {
      setErrorMessage('保存配置到 .tie/.env 文件失败');
    }
  };

  const handleCustomLLMConfigCancel = () => {
    setShowCustomLLMConfig(false);
    setErrorMessage(null);
  };

  const handleAuthSelect = async (authMethod: AuthType) => {
    setHasUserSelected(true);

    if (authMethod === AuthType.CUSTOM_LLM) {
      // 检查是否已经有完整的环境变量配置
      const hasCompleteConfig =
        process.env['TIE_API_KEY'] &&
        process.env['TIE_ENDPOINT'] &&
        process.env['TIE_MODEL_NAME'];

      if (hasCompleteConfig) {
        // 如果环境变量已配置，直接使用
        const error = await validateAuthMethod(authMethod);
        if (error) {
          setErrorMessage(error);
        } else {
          setErrorMessage(null);
          onSelect(authMethod, SettingScope.User);
        }
      } else {
        // 如果环境变量未配置，显示配置对话框
        setShowCustomLLMConfig(true);
        setErrorMessage(null);
      }
    } else {
      const error = await validateAuthMethod(authMethod);
      if (error) {
        setErrorMessage(error);
      } else {
        setErrorMessage(null);
        onSelect(authMethod, SettingScope.User);
      }
    }
  };

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        // Prevent exit if there is an error message.
        // This means they user is not authenticated yet.
        if (errorMessage) {
          return;
        }
        if (!hasUserSelected) {
          // Prevent exiting if user hasn't selected an auth method
          setErrorMessage('请选择一个认证方式。按 Ctrl+C 两次退出。');
          return;
        }
        onSelect(undefined, SettingScope.User);
      }
    },
    { isActive: true },
  );

  if (showCustomLLMConfig) {
    return (
      <CustomLLMConfigDialog
        onComplete={handleCustomLLMConfigComplete}
        onCancel={handleCustomLLMConfigCancel}
        onSavePartial={handleCustomLLMConfigSavePartial}
        initialConfig={{
          apiKey: process.env['TIE_API_KEY'] || '',
          endpoint: process.env['TIE_ENDPOINT'] || '',
          modelName: process.env['TIE_MODEL_NAME'] || '',
        }}
      />
    );
  }

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Get started</Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate for this project?</Text>
      </Box>
      <Box marginTop={1}>
        <RadioButtonSelect
          items={items}
          initialIndex={initialAuthIndex}
          onSelect={handleAuthSelect}
          onHighlight={() => setHasUserSelected(true)}
        />
      </Box>
      {errorMessage && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{errorMessage}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={Colors.Gray}>(Use Enter to select)</Text>
      </Box>
      <Box marginTop={1}>
        <Text>Terms of Services and Privacy Notice for Gemini CLI</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={Colors.AccentBlue}>
          {
            'https://github.com/google-gemini/gemini-cli/blob/main/docs/tos-privacy.md'
          }
        </Text>
      </Box>
    </Box>
  );
}
