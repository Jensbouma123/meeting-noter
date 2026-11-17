// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyboardShortcutsParams } from '../types';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

const makeParams = (overrides: Partial<KeyboardShortcutsParams> = {}): KeyboardShortcutsParams => ({
  status: 'idle',
  modelReady: true,
  helpOpen: false,
  settingsOpen: false,
  setHelpOpen: vi.fn(),
  setSettingsOpen: vi.fn(),
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  startRecording: vi.fn(() => Promise.resolve()),
  stopRecording: vi.fn(() => Promise.resolve()),
  ...overrides,
});

const pressKey = (key: string, target: EventTarget = window, init: KeyboardEventInit = {}) => {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
};

let params: KeyboardShortcutsParams;

beforeEach(() => {
  params = makeParams();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('useKeyboardShortcuts record toggle', () => {
  it('starts recording on R when idle and the model is ready', () => {
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.startRecording).toHaveBeenCalledTimes(1);
    expect(params.stopRecording).not.toHaveBeenCalled();
  });

  it('starts recording on uppercase R too', () => {
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('R');
    expect(params.startRecording).toHaveBeenCalledTimes(1);
  });

  it('does not start recording when the model is not ready', () => {
    params = makeParams({ modelReady: false });
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('stops recording on R while live', () => {
    params = makeParams({ status: 'live' });
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.stopRecording).toHaveBeenCalledTimes(1);
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('ignores auto-repeat keydown events', () => {
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r', window, { repeat: true });
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('ignores R with a modifier so browser reload and similar combos keep working', () => {
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r', window, { metaKey: true });
    pressKey('r', window, { ctrlKey: true });
    pressKey('r', window, { altKey: true });
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it.each(['input', 'textarea', 'select'])('is ignored while focus is in a %s', (tag) => {
    const field = document.createElement(tag);
    document.body.appendChild(field);
    field.focus();
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r', field);
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('is ignored while focus is in a contenteditable element', () => {
    const editor = document.createElement('div');
    editor.tabIndex = 0;
    Object.defineProperty(editor, 'isContentEditable', { value: true });
    document.body.appendChild(editor);
    editor.focus();
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r', editor);
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('is not fired while the shortcuts help dialog is open', () => {
    params = makeParams({ helpOpen: true });
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('is not fired while the settings dialog is open', () => {
    params = makeParams({ settingsOpen: true });
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.startRecording).not.toHaveBeenCalled();
  });

  it('is not fired while a dialog is open even when live, so stop stays guarded too', () => {
    params = makeParams({ status: 'live', helpOpen: true });
    renderHook(() => useKeyboardShortcuts(params));
    pressKey('r');
    expect(params.stopRecording).not.toHaveBeenCalled();
  });
});
