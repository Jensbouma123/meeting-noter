// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MicPicker } from './MicPicker';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './types';

const DEVICES = [
  { deviceId: 'default', kind: 'audioinput', label: 'Default - Built-in' },
  { deviceId: 'a1', kind: 'audioinput', label: 'AirPods' },
  { deviceId: 'b2', kind: 'audioinput', label: '' },
];

function stubDevices(list: unknown[]) {
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

const ui = (value: string, onChange = vi.fn(), locked = false) => (
  <LanguageContext.Provider value="en">
    <MicPicker value={value} onChange={onChange} locked={locked} mode="both" active={false} />
  </LanguageContext.Provider>
);

async function open() {
  const btn = screen.getByRole('button', { name: 'Choose microphone' });
  await waitFor(() => expect(navigator.mediaDevices.enumerateDevices).toHaveBeenCalled());
  await act(async () => {});
  fireEvent.click(btn);
}

describe('MicPicker', () => {
  it('lists Default plus devices with generic names for unlabeled ones, current checked', async () => {
    stubDevices(DEVICES);
    render(ui('a1'));
    await open();
    const items = await screen.findAllByRole('menuitem', { hidden: true });
    expect(items.map((i) => i.textContent)).toEqual(['Default', 'AirPods', 'Microphone 2']);
    expect(items.map((i) => i.getAttribute('aria-current'))).toEqual([null, 'true', null]);
  });

  it('reports the chosen device, and the choice persists through the shared settings store', async () => {
    stubDevices(DEVICES);
    const onChange = vi.fn((id: string) => saveSettings({ ...DEFAULT_SETTINGS, micDeviceId: id }));
    render(ui('default', onChange));
    await open();
    fireEvent.click(await screen.findByRole('menuitem', { name: 'AirPods', hidden: true }));
    expect(onChange).toHaveBeenCalledWith('a1');
    expect(loadSettings().micDeviceId).toBe('a1');
  });

  it('opens above the button, right-aligned, with an 8px gap', async () => {
    stubDevices(DEVICES);
    render(ui('default'));
    await open();
    const menu = await screen.findByRole('menu', { hidden: true });
    // Placement itself is CSS (`.mic-menu` in globals.css: block-start, flips when out of room).
    expect(menu).toHaveClass('mic-menu');
    expect(menu).toHaveAttribute('data-align', 'end');
    expect(menu.style.getPropertyValue('--dropdown-offset')).toBe('8px');
  });

  it('stacks mic over call rows in one pill, mic only when call is not recorded', () => {
    stubDevices(DEVICES);
    const { rerender } = render(ui('default'));
    const pill = screen.getByRole('button', { name: 'Choose microphone' });
    expect(pill.querySelectorAll('svg')).toHaveLength(2);
    rerender(
      <LanguageContext.Provider value="en">
        <MicPicker value="default" onChange={vi.fn()} locked={false} mode="mic" active={false} />
      </LanguageContext.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Choose microphone' }).querySelectorAll('svg')).toHaveLength(1);
  });

  it('refreshes the list on devicechange', async () => {
    const listeners = stubDevices([DEVICES[1]]);
    render(ui('default'));
    await act(async () => {});
    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockResolvedValue(DEVICES);
    await act(async () => listeners.forEach((l) => l()));
    await open();
    expect((await screen.findAllByRole('menuitem', { hidden: true })).map((i) => i.textContent)).toContain('Microphone 2');
  });

  it('is disabled with an explanatory tooltip while recording', async () => {
    stubDevices(DEVICES);
    render(ui('default', vi.fn(), true));
    const btn = screen.getByRole('button', { name: 'Choose microphone' });
    expect(btn).toBeDisabled();
    fireEvent.mouseEnter(btn.parentElement!);
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Stop recording to change microphone');
  });
});
