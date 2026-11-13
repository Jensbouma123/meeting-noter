// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { NO_MODEL_PROGRESS } from './modelReadiness';

const capture = { missing: true, listeners: new Set<() => void>() };
vi.mock('@/lib/meeting', () => ({
  getCallAudioMissing: () => capture.missing,
  subscribeCallAudio: (fn: () => void) => {
    capture.listeners.add(fn);
    return () => capture.listeners.delete(fn);
  },
  getMeetingDiagnostics: () => ({ capture: { shareSilent: true, displaySurface: 'browser' } }),
  meeting: {
    release: () => Promise.resolve(),
    subscribeLevels: () => () => {},
    listMicDevices: () => Promise.resolve([]),
  },
}));

import { BottomDock } from './BottomDock';

beforeEach(() => {
  capture.missing = true;
});
afterEach(cleanup);

function renderDock(status: 'live' | 'idle' = 'live', onOpenAdvanced = vi.fn()) {
  const ui = (
    <LanguageContext.Provider value="en">
      <BottomDock
        status={status}
        mode="both"
        modelReadiness="ready"
        modelProgress={NO_MODEL_PROGRESS}
        onModeChange={() => {}}
        onStart={() => {}}
        onStop={() => {}}
        onPause={() => {}}
        onResume={() => {}}
        onOpenAdvanced={onOpenAdvanced}
      />
    </LanguageContext.Provider>
  );
  const view = render(ui);
  return { onOpenAdvanced, rerender: () => view.rerender(ui) };
}

describe('missing call audio indicator', () => {
  it('stays a button, so it can still be reached and activated', () => {
    const { onOpenAdvanced } = renderDock();
    const indicator = screen.getByRole('button', { name: /No call audio/ });
    fireEvent.click(indicator);
    expect(onOpenAdvanced).toHaveBeenCalledOnce();
  });

  it('announces the reason from a polite live region outside the button', () => {
    renderDock();
    const live = screen.getByRole('status');
    expect(live).toHaveTextContent(/Call audio isn't being recorded/);
    expect(screen.getByRole('button', { name: /No call audio/ })).not.toContainElement(live);
  });

  it('disappears once call audio is attached again', () => {
    renderDock();
    expect(screen.getByRole('button', { name: /No call audio/ })).toBeInTheDocument();
    capture.missing = false;
    act(() => capture.listeners.forEach((notify) => notify()));
    expect(screen.queryByRole('button', { name: /No call audio/ })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('does not offer it while idle', () => {
    renderDock('idle');
    expect(screen.queryByRole('button', { name: /No call audio/ })).toBeNull();
  });
});
