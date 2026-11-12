// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RightRail } from './RightRail';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

vi.mock('@/components/notes/NotesPanel', () => ({ NotesPanel: () => <div>notes-panel</div> }));

function view(lang: 'en' | 'nl' = 'en') {
  return render(
    <LanguageContext.Provider value={lang}>
      <RightRail sessionId="s1" />
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

  it('is labelled in Dutch', () => {
    view('nl');
    expect(screen.getByRole('button', { name: 'Paneel verbergen' })).toBeTruthy();
    expect(screen.getAllByRole('tab')[0].textContent).toContain('Deelnemers');
  });
});
