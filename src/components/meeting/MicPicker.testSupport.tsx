import { afterEach, expect, vi } from 'vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { MicPicker } from './MicPicker';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

export const DEVICES = [
  { deviceId: 'default', kind: 'audioinput', label: 'Default - Built-in' },
  { deviceId: 'a1', kind: 'audioinput', label: 'AirPods' },
  { deviceId: 'b2', kind: 'audioinput', label: '' },
];

export function stubDevices(list: unknown[]) {
  const listeners: Array<() => void> = [];
  vi.stubGlobal('navigator', {
    mediaDevices: {
      enumerateDevices: vi.fn(async () => list),
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: () => {},
    },
  });
  return listeners;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

export const micPicker = (mode: 'mic' | 'both', locked = false) => (
  <LanguageContext.Provider value="en">
    <MicPicker value="default" onChange={vi.fn()} locked={locked} mode={mode} active={false} />
  </LanguageContext.Provider>
);

export const withMode = (mode: 'mic' | 'both') => micPicker(mode);

export const ui = (value: string, onChange = vi.fn(), locked = false) => (
  <LanguageContext.Provider value="en">
    <MicPicker value={value} onChange={onChange} locked={locked} mode="both" active={false} />
  </LanguageContext.Provider>
);

export async function loaded() {
  await waitFor(() => expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled());
  await act(async () => {});
  return screen.getByRole('combobox', { name: 'Microphone' }) as HTMLSelectElement;
}

export const optionNames = () => screen.getAllByRole('option').map((o) => o.textContent);
