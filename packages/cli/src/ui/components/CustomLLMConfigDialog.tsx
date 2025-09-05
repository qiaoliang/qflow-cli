/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { useKeypress } from '../hooks/useKeypress.js';

interface CustomLLMConfigDialogProps {
  onComplete: (config: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  }) => void;
  onCancel: () => void;
  onSavePartial?: (config: {
    apiKey: string;
    endpoint: string;
    modelName: string;
  }) => void;
  initialConfig?: {
    apiKey?: string;
    endpoint?: string;
    modelName?: string;
  };
}

export function CustomLLMConfigDialog({
  onComplete,
  onCancel,
  onSavePartial,
  initialConfig = {},
}: CustomLLMConfigDialogProps): React.JSX.Element {
  const [config, setConfig] = useState({
    apiKey: initialConfig.apiKey || '',
    endpoint: initialConfig.endpoint || '',
    modelName: initialConfig.modelName || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<
    'apiKey' | 'endpoint' | 'modelName'
  >('apiKey');
  const [inputValues, setInputValues] = useState({
    apiKey: initialConfig.apiKey || '',
    endpoint: initialConfig.endpoint || '',
    modelName: initialConfig.modelName || '',
  });

  const validateApiKey = (apiKey: string): string | null => {
    if (!apiKey.trim()) {
      return 'API Key不能为空';
    }
    return null;
  };

  const validateEndpoint = (endpoint: string): string | null => {
    if (!endpoint.trim()) {
      return 'Endpoint不能为空';
    }
    try {
      new URL(endpoint);
      return null;
    } catch {
      return 'Endpoint必须是有效的URL格式';
    }
  };

  const validateModelName = (modelName: string): string | null => {
    if (!modelName.trim()) {
      return 'Model Name不能为空';
    }
    return null;
  };

  const handleEnter = useCallback(() => {
    setError(null);

    // 验证当前字段
    let error: string | null = null;
    const currentValue = inputValues[activeField];

    switch (activeField) {
      case 'apiKey':
        error = validateApiKey(currentValue);
        break;
      case 'endpoint':
        error = validateEndpoint(currentValue);
        break;
      case 'modelName':
        error = validateModelName(currentValue);
        break;
    }

    if (error) {
      setError(error);
      return;
    }

    // 更新配置和输入值
    setConfig((prevConfig) => {
      const newConfig = { ...prevConfig, [activeField]: currentValue };

      // 移动到下一个字段
      if (activeField === 'apiKey') {
        setActiveField('endpoint');
      } else if (activeField === 'endpoint') {
        setActiveField('modelName');
      } else {
        // 所有字段都完成了，调用 onComplete
        onComplete(newConfig);
      }

      return newConfig;
    });

    setInputValues((prev) => ({ ...prev, [activeField]: currentValue }));
  }, [activeField, inputValues, onComplete]);

  const handleCancel = useCallback(() => {
    // 如果有已输入的值，先保存部分配置
    if (
      onSavePartial &&
      (config.apiKey || config.endpoint || config.modelName)
    ) {
      onSavePartial(config);
    }
    onCancel();
  }, [onCancel, onSavePartial, config]);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        handleCancel();
        return;
      }

      if (key.name === 'return') {
        handleEnter();
        return;
      }

      if (key.name === 'backspace') {
        setInputValues((prev) => ({
          ...prev,
          [activeField]: prev[activeField].slice(0, -1),
        }));
        return;
      }

      // 处理粘贴或普通字符输入
      if (key.paste || (key.sequence && key.sequence.length === 1)) {
        setInputValues((prev) => ({
          ...prev,
          [activeField]: prev[activeField] + key.sequence,
        }));
        return;
      }
    },
    { isActive: true },
  );

  const getFieldLabel = (field: 'apiKey' | 'endpoint' | 'modelName') => {
    switch (field) {
      case 'apiKey':
        return '1. API Key - 您的API密钥';
      case 'endpoint':
        return '2. Endpoint - API端点URL';
      case 'modelName':
        return '3. Model Name - 模型名称';
    }
  };

  const getFieldPrompt = (field: 'apiKey' | 'endpoint' | 'modelName') => {
    switch (field) {
      case 'apiKey':
        return '请输入您的API Key:';
      case 'endpoint':
        return '请输入API端点URL (例如: https://api.openai.com):';
      case 'modelName':
        return '请输入模型名称 (例如: gpt-3.5-turbo):';
    }
  };

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>配置 Custom LLM API</Text>
      <Box marginTop={1}>
        <Text>请提供以下信息来配置您的自定义LLM API:</Text>
      </Box>

      {/* API Key 输入框 */}
      <Box marginTop={1} flexDirection="column">
        <Text
          color={activeField === 'apiKey' ? Colors.AccentBlue : Colors.Gray}
        >
          {getFieldLabel('apiKey')}
        </Text>
        <Text color={Colors.Gray}>{getFieldPrompt('apiKey')}</Text>
        <Box>
          <Text color={Colors.AccentBlue}>{inputValues.apiKey || ''}</Text>
          {activeField === 'apiKey' && <Text color={Colors.Gray}>_</Text>}
        </Box>
      </Box>

      {/* Endpoint 输入框 */}
      <Box marginTop={1} flexDirection="column">
        <Text
          color={activeField === 'endpoint' ? Colors.AccentBlue : Colors.Gray}
        >
          {getFieldLabel('endpoint')}
        </Text>
        <Text color={Colors.Gray}>{getFieldPrompt('endpoint')}</Text>
        <Box>
          <Text color={Colors.AccentBlue}>{inputValues.endpoint || ''}</Text>
          {activeField === 'endpoint' && <Text color={Colors.Gray}>_</Text>}
        </Box>
      </Box>

      {/* Model Name 输入框 */}
      <Box marginTop={1} flexDirection="column">
        <Text
          color={activeField === 'modelName' ? Colors.AccentBlue : Colors.Gray}
        >
          {getFieldLabel('modelName')}
        </Text>
        <Text color={Colors.Gray}>{getFieldPrompt('modelName')}</Text>
        <Box>
          <Text color={Colors.AccentBlue}>{inputValues.modelName || ''}</Text>
          {activeField === 'modelName' && <Text color={Colors.Gray}>_</Text>}
        </Box>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color={Colors.AccentRed}>{error}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color={Colors.Gray}>
          提示: 您也可以提前设置环境变量 TIE_API_KEY, TIE_ENDPOINT,
          TIE_MODEL_NAME
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color={Colors.Gray}>(按Esc保存并完成配置)</Text>
      </Box>
    </Box>
  );
}
