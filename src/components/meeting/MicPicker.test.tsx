// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MicPicker } from './MicPicker';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settingsStorage';
import { DEVICES, loaded, optionNames, stubDevices, ui } from './MicPicker.testSupport';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

describe('MicPicker', () => {
  it('lists Default plus devices with generic names for unlabeled ones, current selected', async () => {
    stubDevices(DEVICES);
    render(ui('a1'));
    const select = await loaded();
    expect(optionNames()).toEqual(['Default', 'AirPods', 'Microphone 2']);
    expect(select.value).toBe('a1');
  });

  it('reports the chosen device, and the choice persists through the shared settings store', async () => {
    stubDevices(DEVICES);
    const onChange = vi.fn((id: string) => saveSettings({ ...DEFAULT_SETTINGS, micDeviceId: id }));
    render(ui('default', onChange));
    fireEvent.change(await loaded(), { target: { value: 'a1' } });
    expect(onChange).toHaveBeenCalledWith('a1');
    expect(loadSettings().micDeviceId).toBe('a1');
  });

  it('marks missing call audio instead of drawing an empty call bar', () => {
    stubDevices(DEVICES);
    render(
      <LanguageContext.Provider value="en">
        <MicPicker value="default" onChange={vi.fn()} locked mode="both" active callMissing />
      </LanguageContext.Provider>,
    );
    expect(screen.getAllByRole('meter', { hidden: true }).map((m) => m.getAttribute('aria-label'))).toEqual([
      'Mic level',
    ]);
    expect(screen.getByRole('img', { name: 'Call audio level: none', hidden: true })).toBeInTheDocument();
  });

  it('refreshes the list on devicechange', async () => {
    const listeners = stubDevices([DEVICES[1]]);
    render(ui('default'));
    await loaded();
    expect(optionNames()).toEqual(['Default', 'AirPods']);
    (navigator.mediaDevices.enumerateDevices as ReturnType<typeof vi.fn>).mockResolvedValue(DEVICES);
    await act(async () => listeners.forEach((l) => l()));
    expect(optionNames()).toContain('Microphone 2');
  });

  it('is disabled with an explanatory note while recording', async () => {
    stubDevices(DEVICES);
    render(ui('default', vi.fn(), true));
    const select = await loaded();
    expect(select).toBeDisabled();
    expect(select).toHaveAccessibleDescription('Stop recording to change microphone');
  });
});
