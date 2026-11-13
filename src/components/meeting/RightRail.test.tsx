// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RightRail } from './RightRail';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ToastProvider } from '@jensbouma123/acciva-ui';

vi.mock('@/components/notes/NotesPanel', () => ({ NotesPanel: () => <div>notes-panel</div> }));

function view(lang: 'en' | 'nl' = 'en') {
  return render(
    <LanguageContext.Provider value={lang}>
      <ToastProvider>
        <RightRail sessionId="s1" />
      </ToastProvider>
    </LanguageContext.Provider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

describe('RightRail header tabs', () => {
  it('has two tabs, the count inside Participants, and no separate heading', () => {
    view();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Participants0', 'Summary']);
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[0].id);
  });

  it('switches tab by click and with arrow keys (roving tabindex)', () => {
    view();
    const [participants, summary] = screen.getAllByRole('tab');
    fireEvent.click(summary);
    expect(screen.getByText('notes-panel')).toBeTruthy();
    expect(summary.getAttribute('aria-selected')).toBe('true');
    expect(summary.tabIndex).toBe(0);
    expect(participants.tabIndex).toBe(-1);
    fireEvent.keyDown(summary, { key: 'ArrowLeft' });
    expect(participants.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(participants);
  });

  it('hides and reopens the panel with the labelled icon buttons', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Hide panel' }));
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Show panel' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('animates its width with the left sidebar transition, honouring reduced motion', () => {
    const { container } = view();
    const rail = container.querySelector('aside') as HTMLElement;
    for (const cls of ['transition-[width]', 'duration-200', 'ease-in-out', 'motion-reduce:transition-none']) {
      expect(rail.className).toContain(cls);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Hide panel' }));
    expect(container.querySelector('aside')).toBe(rail);
    expect(rail.className).toContain('w-12');
    expect(rail.className).toContain('transition-[width]');
    expect(rail.className).toContain('motion-reduce:transition-none');
  });

  it('moves focus to the reopen button after hiding and to the hide button after showing', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Hide panel' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show panel' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Hide panel' }));
  });

  it('is labelled in Dutch', () => {
    view('nl');
    expect(screen.getByRole('button', { name: 'Paneel verbergen' })).toBeTruthy();
    expect(screen.getAllByRole('tab')[0].textContent).toContain('Deelnemers');
  });
});

describe('RightRail tab keyboard model', () => {
  it('wraps with ArrowRight/ArrowLeft and honours Home/End', () => {
    view();
    const [participants, summary] = screen.getAllByRole('tab');
    participants.focus();
    fireEvent.keyDown(participants, { key: 'ArrowLeft' });
    expect(summary.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(summary, { key: 'ArrowRight' });
    expect(participants.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(participants, { key: 'End' });
    expect(summary.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(summary);
    fireEvent.keyDown(summary, { key: 'Home' });
    expect(participants.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(participants);
  });

  it('wires each tab to the panel it controls', () => {
    view();
    const tabs = screen.getAllByRole('tab');
    const panel = screen.getByRole('tabpanel');
    expect(panel.id).toBe(tabs[0].getAttribute('aria-controls'));
    fireEvent.click(tabs[1]);
    expect(screen.getByRole('tabpanel').id).toBe(tabs[1].getAttribute('aria-controls'));
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[1].id);
  });

  it('leaves other keys to the page', () => {
    view();
    const [participants] = screen.getAllByRole('tab');
    const notPrevented = fireEvent.keyDown(participants, { key: 'ArrowDown' });
    expect(notPrevented).toBe(true);
    expect(participants.getAttribute('aria-selected')).toBe('true');
  });
});
