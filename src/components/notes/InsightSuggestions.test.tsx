// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getNotes } from '@/lib/meeting/notes';
import { SEEK_EVENT } from '@/lib/meeting/seek-event';
import { loadInsights, saveInsights } from '@/lib/semantic-search/insights/store';
import { InsightSuggestions } from './InsightSuggestions';
import { NotesPanel } from './NotesPanel';

const t = (key: string) => key;
const speakers = [{ id: 'mic:0', label: 'Jens', colorIndex: 0, source: 'mic' as const }];
const set = {
  version: 2,
  items: [
    { id: 'decision:s1:0', kind: 'decision' as const, text: 'We ship on Friday.', segmentId: 's1', speakerId: 'mic:0', start: 65, score: 0.7 },
    { id: 'action:s2:0', kind: 'action' as const, text: 'I will send the notes.', segmentId: 's2', speakerId: 'mic:0', start: 90, score: 0.7 },
  ],
  dismissed: [],
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}')));
  saveInsights('m1', set);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('InsightSuggestions', () => {
  it('shows quote, timestamp and speaker', () => {
    render(<InsightSuggestions sessionId="m1" speakers={speakers} t={t} />);
    expect(screen.getByText(/We ship on Friday/)).toBeTruthy();
    expect(screen.getAllByText(/01:05 · Jens/)).toHaveLength(1);
  });

  it('jump dispatches a seek to the start time', () => {
    const onSeek = vi.fn();
    window.addEventListener(SEEK_EVENT, onSeek);
    render(<InsightSuggestions sessionId="m1" speakers={speakers} t={t} />);
    fireEvent.click(screen.getByLabelText('jump: We ship on Friday.'));
    window.removeEventListener(SEEK_EVENT, onSeek);
    expect((onSeek.mock.calls[0][0] as CustomEvent<number>).detail).toBe(65);
  });

  it('accept promotes to a decision with its source segment and hides the suggestion', () => {
    render(<InsightSuggestions sessionId="m1" speakers={speakers} t={t} />);
    fireEvent.click(screen.getByLabelText('accept: We ship on Friday.'));
    expect(getNotes('m1').decisions).toMatchObject([{ text: 'We ship on Friday.', sourceSegmentId: 's1' }]);
    expect(screen.queryByText(/We ship on Friday/)).toBeNull();
  });

  it('dismiss persists locally and is pushed to the server', () => {
    render(<InsightSuggestions sessionId="m1" speakers={speakers} t={t} />);
    fireEvent.click(screen.getByLabelText('dismiss: I will send the notes.'));
    expect(loadInsights('m1').dismissed).toEqual(['action:s2:0']);
    expect(screen.queryByText(/I will send the notes/)).toBeNull();
    const body = JSON.parse((vi.mocked(fetch).mock.calls.at(-1)![1] as RequestInit).body as string);
    expect(body.dismissed).toEqual(['action:s2:0']);
  });

  it('marks suggestions as such and keeps them out of the counts until accepted', () => {
    render(<NotesPanel sessionId="m1" speakers={speakers} />);
    expect(screen.getByText('Decisions (0)')).toBeTruthy();
    expect(screen.getByText('Action items (0)')).toBeTruthy();
    expect(screen.getAllByText('Suggestion')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Accept: We ship on Friday.'));
    expect(screen.getByText('Decisions (1)')).toBeTruthy();
    expect(screen.getAllByText('Suggestion')).toHaveLength(1);
  });
});
