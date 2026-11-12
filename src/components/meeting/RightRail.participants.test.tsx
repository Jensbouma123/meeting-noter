// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RightRail } from './RightRail';
import { LanguageContext } from '@/lib/i18n/LanguageContext';
import { ToastProvider } from '@jensbouma123/acciva-ui';
import { getParticipants, setParticipants } from '@/lib/meeting/participants';

const renameSpeaker = vi.fn();
vi.mock('./store', () => ({ meeting: { renameSpeaker: (...a: unknown[]) => renameSpeaker(...a) } }));
vi.mock('@/components/notes/NotesPanel', () => ({ NotesPanel: () => <div>notes-panel</div> }));
vi.mock('@/lib/meeting', () => ({
  useSpeakerStats: () => [
    { id: '1', label: 'Anna', time: 10, percentage: 50, colorIndex: 0, source: 'system' },
    { id: '2', label: 'Speaker 2', time: 10, percentage: 50, colorIndex: 1, source: 'system' },
  ],
}));

beforeEach(() => {
  window.localStorage.clear();
  renameSpeaker.mockClear();
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  setParticipants('s1', ['Anna', 'Jan']);
});
afterEach(cleanup);

function view() {
  render(
    <LanguageContext.Provider value="en">
      <ToastProvider>
        <RightRail sessionId="s1" />
      </ToastProvider>
    </LanguageContext.Provider>,
  );
}

describe('RightRail participants', () => {
  it('lists the meeting participants, edits them, and says who is not matched yet', () => {
    view();
    expect(screen.getByTestId('participants-unassigned')).toHaveTextContent('Jan');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Jan' }));
    expect(getParticipants('s1')).toEqual(['Anna']);
    expect(screen.queryByTestId('participants-unassigned')).toBeNull();
  });

  it('offers participants as quick picks while renaming a speaker', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Speaker 2' }));
    const picks = screen.getByRole('group', { name: 'Pick a name' });
    fireEvent.click(picks.querySelector('button:last-child') as HTMLElement);
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Jan');
  });
});
