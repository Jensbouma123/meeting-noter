import { useEffect } from 'react';
import type { KeyboardShortcutsParams } from '../types';

const isTypingTarget = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  try {
    return Boolean(el.isContentEditable);
  } catch {
    return false;
  }
};

export function useKeyboardShortcuts({
  status,
  modelReady,
  helpOpen,
  settingsOpen,
  setHelpOpen,
  setSettingsOpen,
  pauseRecording,
  resumeRecording,
  startRecording,
  stopRecording,
}: KeyboardShortcutsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
        }
        return;
      }

      if (isTypingTarget()) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mn:search'));
        return;
      }
      if (mod && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mn:export'));
        return;
      }
      if (mod || e.altKey) return;

      if (e.key === '?') {
        setHelpOpen(true);
        return;
      }

      if (e.code === 'Space' && (status === 'live' || status === 'paused')) {
        e.preventDefault();
        if (status === 'live') pauseRecording();
        else resumeRecording();
        return;
      }

      if ((e.key === 'r' || e.key === 'R') && !e.repeat) {
        if (status === 'idle' || status === 'error') {
          if (modelReady) void startRecording();
        } else if (status === 'live' || status === 'paused') {
          void stopRecording();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    status,
    pauseRecording,
    resumeRecording,
    startRecording,
    stopRecording,
    helpOpen,
    settingsOpen,
    modelReady,
    setHelpOpen,
    setSettingsOpen,
  ]);
}
