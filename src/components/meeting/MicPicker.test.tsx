// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MicPicker } from './MicPicker';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settingsStorage';

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

describe('MicPicker level bars', () => {
  const withMode = (mode: 'mic' | 'both') => (
    <LanguageContext.Provider value="en">
      <MicPicker value="default" onChange={vi.fn()} locked={false} mode={mode} active={false} />
    </LanguageContext.Provider>
  );

  it('shows a vertical mic bar and a call bar in both mode', () => {
    stubDevices(DEVICES);
    render(withMode('both'));
    const meters = screen.getAllByRole('meter', { hidden: true });
    expect(meters.map((m) => m.getAttribute('aria-label'))).toEqual(['Mic level', 'Call audio level']);
    for (const m of meters) {
      expect(m).toHaveAttribute('aria-valuemin', '0');
      expect(m).toHaveAttribute('aria-valuemax', '100');
      // Fill grows by height (bottom to top), never by width.
      expect((m.firstElementChild as HTMLElement).style.height).toBe('8%');
    }
  });

  it('shows only the mic bar in mic-only mode', () => {
    stubDevices(DEVICES);
    render(withMode('mic'));
    expect(screen.getAllByRole('meter', { hidden: true })).toHaveLength(1);
  });
});

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

  it('shows one icon per recorded source plus a menu chevron, and drops the chevron while locked', () => {
    stubDevices(DEVICES);
    const picker = (mode: 'mic' | 'both', locked: boolean) => (
      <LanguageContext.Provider value="en">
        <MicPicker value="default" onChange={vi.fn()} locked={locked} mode={mode} active={false} />
      </LanguageContext.Provider>
    );
    const icons = () => screen.getByRole('button', { name: 'Choose microphone' }).querySelectorAll('svg');
    const { rerender } = render(picker('both', false));
    expect(icons()).toHaveLength(3);
    rerender(picker('mic', false));
    expect(icons()).toHaveLength(2);
    rerender(picker('mic', true));
    expect(icons()).toHaveLength(1);
  });

  it('marks missing call audio instead of drawing an empty call bar', () => {
    stubDevices(DEVICES);
    render(
      <LanguageContext.Provider value="en">
        <MicPicker value="default" onChange={vi.fn()} locked mode="both" active callMissing />
      </LanguageContext.Provider>,
    );
    expect(screen.getAllByRole('meter', { hidden: true }).map((m) => m.getAttribute('aria-label'))).toEqual(['Mic level']);
    expect(screen.getByRole('img', { name: 'Call audio level: none', hidden: true })).toBeInTheDocument();
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
