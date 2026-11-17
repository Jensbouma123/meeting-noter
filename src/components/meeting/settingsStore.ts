import { useSyncExternalStore, type SetStateAction } from 'react';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settingsStorage';
import type { AppSettings } from './types';

let cached: AppSettings | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribeSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSettingsSnapshot(): AppSettings {
  cached ??= loadSettings();
  return cached;
}

function getServerSettingsSnapshot(): AppSettings {
  return DEFAULT_SETTINGS;
}

export function setAppSettings(next: SetStateAction<AppSettings>): void {
  const settings = typeof next === 'function' ? next(getSettingsSnapshot()) : next;
  cached = settings;
  saveSettings(settings);
  emit();
}

export function updateSettings(patch: Partial<AppSettings>): void {
  setAppSettings((current) => ({ ...current, ...patch }));
}

export function resetSettingsStoreForTests(): void {
  cached = null;
  emit();
}

export function useAppSettings(): AppSettings {
  return useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
}
