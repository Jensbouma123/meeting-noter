// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RightRail } from './RightRail';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { installViewport, VIEWPORTS } from '@/test/viewport';
import { RAIL_OPEN_KEY } from './railOpenState';

vi.mock('@/components/notes/NotesPanel', () => ({ NotesPanel: () => <div>notes-panel</div> }));

function view() {
  return render(
    <LanguageContext.Provider value="en">
      <ToastProvider>
        <RightRail sessionId="s1" />
      </ToastProvider>
    </LanguageContext.Provider>,
  );
}

let restoreViewport = () => {};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  restoreViewport();
});

describe('RightRail initial open state', () => {
  const railOpen = () => screen.queryAllByRole('tab').length > 0;

  it('starts open at 1280 and collapsed at 768 without a stored preference', () => {
    restoreViewport = installViewport(1280);
    view();
    expect(railOpen()).toBe(true);
    cleanup();
    restoreViewport();
    restoreViewport = installViewport(VIEWPORTS.tablet);
    view();
    expect(railOpen()).toBe(false);
  });

  it('lets a stored preference win over the breakpoint default', () => {
    restoreViewport = installViewport(VIEWPORTS.tablet);
    window.localStorage.setItem(RAIL_OPEN_KEY, '1');
    view();
    expect(railOpen()).toBe(true);
    cleanup();
    restoreViewport();
    restoreViewport = installViewport(1280);
    window.localStorage.setItem(RAIL_OPEN_KEY, '0');
    view();
    expect(railOpen()).toBe(false);
  });
});
