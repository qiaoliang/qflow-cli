/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import type { LoadedSettings, SettingScope } from '../../config/settings.js';
import { AuthType, type Config } from '@google/gemini-cli-core';
import {
  clearCachedCredentialFile,
  getErrorMessage,
} from '@google/gemini-cli-core';
import { runExitCleanup } from '../../utils/cleanup.js';

export const useAuthCommand = (
  settings: LoadedSettings,
  setAuthError: (error: string | null) => void,
  config: Config,
) => {
  // 检查TIE环境变量的完整性
  const hasTieApiKey = !!process.env['TIE_API_KEY'];
  const hasTieEndpoint = !!process.env['TIE_ENDPOINT'];
  const hasTieModelName = !!process.env['TIE_MODEL_NAME'];
  const hasPartialTieConfig = hasTieApiKey || hasTieEndpoint || hasTieModelName;
  const hasCompleteTieConfig = hasTieApiKey && hasTieEndpoint && hasTieModelName;
  
  // 如果部分TIE环境变量存在但不完整，强制显示认证对话框
  const shouldForceAuthDialog = hasPartialTieConfig && !hasCompleteTieConfig;
  
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(
    settings.merged.security?.auth?.selectedType === undefined || shouldForceAuthDialog,
  );

  const openAuthDialog = useCallback(() => {
    setIsAuthDialogOpen(true);
  }, []);

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const authFlow = async () => {
      const authType = settings.merged.security?.auth?.selectedType;
      
      // 如果认证对话框已打开，或者没有认证类型，或者TIE环境变量不完整，则不执行认证流程
      if (isAuthDialogOpen || !authType || shouldForceAuthDialog) {
        return;
      }

      try {
        setIsAuthenticating(true);
        await config.refreshAuth(authType);
        console.log(`Authenticated via "${authType}".`);
      } catch (e) {
        setAuthError(`Failed to login. Message: ${getErrorMessage(e)}`);
        openAuthDialog();
      } finally {
        setIsAuthenticating(false);
      }
    };

    void authFlow();
  }, [isAuthDialogOpen, settings, config, setAuthError, openAuthDialog, shouldForceAuthDialog]);

  const handleAuthSelect = useCallback(
    async (authType: AuthType | undefined, scope: SettingScope) => {
      if (authType) {
        await clearCachedCredentialFile();

        settings.setValue(scope, 'security.auth.selectedType', authType);
        if (
          authType === AuthType.LOGIN_WITH_GOOGLE &&
          config.isBrowserLaunchSuppressed()
        ) {
          runExitCleanup();
          console.log(
            `
----------------------------------------------------------------
Logging in with Google... Please restart Tie CLI to continue.
----------------------------------------------------------------
            `,
          );
          process.exit(0);
        }
      }
      setIsAuthDialogOpen(false);
      setAuthError(null);
    },
    [settings, setAuthError, config],
  );

  const cancelAuthentication = useCallback(() => {
    setIsAuthenticating(false);
  }, []);

  return {
    isAuthDialogOpen,
    openAuthDialog,
    handleAuthSelect,
    isAuthenticating,
    cancelAuthentication,
  };
};
