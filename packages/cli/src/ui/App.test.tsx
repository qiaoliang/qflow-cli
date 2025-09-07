/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils/render.js';
import {  App } from './App.js';
import type {
  AccessibilitySettings,
  MCPServerConfig,
  ToolRegistry,
  SandboxConfig,
  GeminiClient,
  AuthType,
} from '@tiecode/tie-cli-core';
import {
  ApprovalMode,
  ideContext,
  Config as ServerConfig,
} from '@tiecode/tie-cli-core';
import type { SettingsFile, Settings } from '../config/settings.js';
import { LoadedSettings } from '../config/settings.js';
import process from 'node:process';
import { useGeminiStream } from './hooks/useGeminiStream.js';
import { useConsoleMessages } from './hooks/useConsoleMessages.js';
import type { ConsoleMessageItem } from './types.js';

import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { UIStateContext, type UIState } from './contexts/UIStateContext.js';
import { StreamingState } from './types.js';

// Mock components to isolate App component testing
vi.mock('./components/Composer.js', () => ({
  Composer: () => <Text>Composer</Text>,
}));

vi.mock('./components/Notifications.js', () => ({
  Notifications: () => <Text>Notifications</Text>,
}));

vi.mock('./components/QuittingDisplay.js', () => ({
  QuittingDisplay: () => <Text>Quitting...</Text>,
}));

describe('App', () => {
  const mockUIState: Partial<UIState> = {
    streamingState: StreamingState.Idle,
    quittingMessages: null,
    dialogsVisible: false,
    mainControlsRef: { current: null },
  };

  it('should render main content and composer when not quitting', () => {
    const { lastFrame } = render(
      <UIStateContext.Provider value={mockUIState as UIState}>
        <App />
      </UIStateContext.Provider>,
    );

    expect(lastFrame()).toContain('MainContent');
    expect(lastFrame()).toContain('Notifications');
    expect(lastFrame()).toContain('Composer');
  });

  it('should render quitting display when quittingMessages is set', () => {
    const quittingUIState = {
      ...mockUIState,
      quittingMessages: [{ id: 1, type: 'user', text: 'test' }],
    } as UIState;

    const { lastFrame } = render(
      <UIStateContext.Provider value={quittingUIState}>
        <App />
      </UIStateContext.Provider>,
    );

    expect(lastFrame()).toContain('Quitting...');
  });

  it('should render dialog manager when dialogs are visible', () => {
    const dialogUIState = {
      ...mockUIState,
      dialogsVisible: true,
    } as UIState;

    const { lastFrame } = render(
      <UIStateContext.Provider value={dialogUIState}>
        <App />
      </UIStateContext.Provider>,
    );

    expect(lastFrame()).toContain('MainContent');
    expect(lastFrame()).toContain('Notifications');
    expect(lastFrame()).toContain('DialogManager');
  });
});
