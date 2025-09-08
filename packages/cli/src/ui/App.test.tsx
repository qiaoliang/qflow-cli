/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { App } from './App.js';
import { renderWithProviders } from '../test-utils/render.js';

import { Text } from 'ink';
import { UIStateContext, type UIState } from './contexts/UIStateContext.js';
import { AppContext } from './contexts/AppContext.js';
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

vi.mock('./components/DialogManager.js', () => ({
  DialogManager: () => <Text>DialogManager</Text>,
}));

describe('App', () => {
  const mockUIState: Partial<UIState> = {
    streamingState: StreamingState.Idle,
    quittingMessages: null,
    dialogsVisible: false,
    mainControlsRef: { current: null },
    history: [],
    pendingHistoryItems: [],
    mainAreaWidth: 80,
    staticAreaMaxItemHeight: 20,
    availableTerminalHeight: 24,
    historyRemountKey: 0,
    slashCommands: [],
    constrainHeight: false,
    isEditorDialogOpen: false,
  };

  const mockAppState = {
    version: '1.0.0',
    startupWarnings: [],
  };

  it('should render main content and composer when not quitting', () => {
    const { lastFrame } = renderWithProviders(
      <AppContext.Provider value={mockAppState}>
        <UIStateContext.Provider value={mockUIState as UIState}>
          <App />
        </UIStateContext.Provider>
      </AppContext.Provider>,
    );

    expect(lastFrame()).toContain('Notifications');
    expect(lastFrame()).toContain('Composer');
    expect(lastFrame()).toContain('Tips for getting started');
  });

  it('should render quitting display when quittingMessages is set', () => {
    const quittingUIState = {
      ...mockUIState,
      quittingMessages: [{ id: 1, type: 'user', text: 'test' }],
    } as UIState;

    const { lastFrame } = renderWithProviders(
      <AppContext.Provider value={mockAppState}>
        <UIStateContext.Provider value={quittingUIState}>
          <App />
        </UIStateContext.Provider>
      </AppContext.Provider>,
    );

    expect(lastFrame()).toContain('Quitting...');
  });

  it('should render dialog manager when dialogs are visible', () => {
    const dialogUIState = {
      ...mockUIState,
      dialogsVisible: true,
    } as UIState;

    const { lastFrame } = renderWithProviders(
      <AppContext.Provider value={mockAppState}>
        <UIStateContext.Provider value={dialogUIState}>
          <App />
        </UIStateContext.Provider>
      </AppContext.Provider>,
    );

    expect(lastFrame()).toContain('Notifications');
    expect(lastFrame()).toContain('DialogManager');
    expect(lastFrame()).toContain('Tips for getting started');
  });
});
