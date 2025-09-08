/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import type React from 'react';
import { vi } from 'vitest';
import { KeypressProvider } from '../ui/contexts/KeypressContext.js';
import { UIActionsContext } from '../ui/contexts/UIActionsContext.js';
import { SettingsContext } from '../ui/contexts/SettingsContext.js';
import { ConfigContext } from '../ui/contexts/ConfigContext.js';
import type { UIActions } from '../ui/contexts/UIActionsContext.js';
import type { LoadedSettings } from '../config/settings.js';
import type { Config } from '@tiecode/tie-cli-core';

const mockUIActions: UIActions = {
  handleThemeSelect: vi.fn(),
  handleThemeHighlight: vi.fn(),
  handleAuthSelect: vi.fn(),
  setAuthState: vi.fn(),
  onAuthError: vi.fn(),
  handleEditorSelect: vi.fn(),
  exitEditorDialog: vi.fn(),
  exitPrivacyNotice: vi.fn(),
  closeSettingsDialog: vi.fn(),
  setShellModeActive: vi.fn(),
  vimHandleInput: vi.fn(() => false),
  handleIdePromptComplete: vi.fn(),
  handleFolderTrustSelect: vi.fn(),
  setConstrainHeight: vi.fn(),
  onEscapePromptChange: vi.fn(),
  refreshStatic: vi.fn(),
  handleFinalSubmit: vi.fn(),
  handleClearScreen: vi.fn(),
  onWorkspaceMigrationDialogOpen: vi.fn(),
  onWorkspaceMigrationDialogClose: vi.fn(),
  handleProQuotaChoice: vi.fn(),
};

const mockSettings: LoadedSettings = {
  merged: {
    security: {
      auth: {},
    },
  },
  setValue: vi.fn(),
} as LoadedSettings;

const mockConfig: Config = {
  isBrowserLaunchSuppressed: vi.fn().mockReturnValue(false),
  getScreenReader: vi.fn().mockReturnValue(false),
  getGeminiMdFileCount: vi.fn().mockReturnValue(0),
} as Config;

export const renderWithProviders = (
  component: React.ReactElement,
): ReturnType<typeof render> =>
  render(
    <KeypressProvider kittyProtocolEnabled={true}>
      <UIActionsContext.Provider value={mockUIActions}>
        <SettingsContext.Provider value={mockSettings}>
          <ConfigContext.Provider value={mockConfig}>
            {component}
          </ConfigContext.Provider>
        </SettingsContext.Provider>
      </UIActionsContext.Provider>
    </KeypressProvider>,
  );
