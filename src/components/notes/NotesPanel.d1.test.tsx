// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSegmentText, triageKey, useSessionIntelligence } from '@/lib/d1/store';
import { setD1Stage } from '@/lib/d1/stage';
import { cancelD1Analysis, recoverStaleD1Run, runD1AnalysisForSession } from '@/lib/meeting/d1-bridge';
import { FIX_WORD_EVENT } from '@/components/meeting/d1-view';
import type { Segment, SessionIntelligence, Speaker } from '@/lib/meeting/types';
import { NotesPanel } from './NotesPanel';

vi.mock('@/lib/d1/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/d1/store')>()),
  useSessionIntelligence: vi.fn(),
}));

vi.mock('@/lib/meeting/d1-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/meeting/d1-bridge')>()),
  isD1ModelCached: () => true,
  runD1AnalysisForSession: vi.fn(),
  cancelD1Analysis: vi.fn(() => Promise.resolve()),
  recoverStaleD1Run: vi.fn(),
}));

const sessionId = 'notes-d1-test';
const speakers: Speaker[] = [{ id: 'sp1', source: 'mic', label: 'Ann', colorIndex: 0 }];
const segment: Segment = {
  id: 's1', source: 'mic', speaker: 'sp1', text: 'We ship on Friday with framna', start: 3, end: 5, final: true,
  lowConfSpans: [[23, 29, 0.4]],
};

function intelligence(overrides: Partial<SessionIntelligence> = {}): SessionIntelligence {
  return {
    sessionId,
    status: 'done',
    progress: { done: 1, total: 1 },
    triageBySegment: {},
    decisions: [],
    actionItems: [],
    error: null,
    updatedAt: 0,
    ...overrides,
  };
}

/** Renders the panel and expands its collapsed Insights section. */
function renderPanel() {
  render(<NotesPanel sessionId={sessionId} speakers={speakers} segments={[segment]} />);
  fireEvent.click(screen.getByRole('button', { name: /Insights/ }));
}

describe('NotesPanel D1 insights', () => {
  beforeEach(() => {
    vi.mocked(runD1AnalysisForSession).mockReset().mockResolvedValue(undefined as never);
    vi.mocked(cancelD1Analysis).mockClear();
    vi.mocked(recoverStaleD1Run).mockClear();
  });
  afterEach(() => cleanup());

  it('lists D1 decisions and action items', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({
      decisions: [{ id: 'd1', text: 'Ship on Friday', segmentIds: ['s1'], start: 3 }],
      actionItems: [{ id: 'a1', text: 'Send notes', segmentIds: ['s1'], start: 3, owner: 'Ann' }],
    }));
    renderPanel();

    expect(screen.getByRole('region', { name: 'Possible decisions' })).toBeTruthy();
    expect(screen.getByText('Ship on Friday')).toBeTruthy();
    expect(screen.getByText(/Send notes/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save: Ship on Friday' })).toBeTruthy();
  });

  it('shows empty lists and runs a scan from the Scan button', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'idle', progress: { done: 0, total: 0 } }));
    renderPanel();

    expect(screen.getAllByText('Nothing found yet.').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Scan transcript' }));
    expect(runD1AnalysisForSession).toHaveBeenCalledWith(sessionId, [segment], { sp1: speakers[0] }, { force: true });
  });

  it('shows Stop instead of Scan while running, and Stop cancels the run', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'running', progress: { done: 3, total: 178 } }));
    renderPanel();

    expect(screen.getByText('Analyzing 3 of 178…').getAttribute('role')).toBe('status');
    expect(screen.queryByRole('button', { name: 'Scan transcript' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(cancelD1Analysis).toHaveBeenCalledWith(sessionId);
  });

  it('shows the current stage and elapsed seconds while running', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2_000_000));
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'running', progress: { done: 0, total: 178 } }));
    setD1Stage({ kind: 'waiting' }, 2_000_000);
    try {
      renderPanel();
      expect(screen.getByText('Waiting for model… · 0 s')).toBeTruthy();

      act(() => { vi.advanceTimersByTime(2_000); });
      expect(screen.getByText('Waiting for model… · 2 s')).toBeTruthy();
    } finally {
      setD1Stage(null);
      vi.useRealTimers();
    }
  });

  it('recovers a stale run once on mount, not on re-render', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'idle', progress: { done: 0, total: 0 } }));
    const { rerender } = render(<NotesPanel sessionId={sessionId} speakers={speakers} segments={[segment]} />);
    rerender(<NotesPanel sessionId={sessionId} speakers={speakers} segments={[segment]} />);

    expect(recoverStaleD1Run).toHaveBeenCalledTimes(1);
    expect(recoverStaleD1Run).toHaveBeenCalledWith(sessionId);
  });

  it('explains a timed-out analysis', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'error', error: 'd1:timeout' }));
    renderPanel();

    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toContain('Analysis took too long and was stopped. Try again.');
  });

  it('dispatches a fix-word event from a flagged word', () => {
    const triage = { segmentId: 's1', textHash: hashSegmentText(segment.text), reviewedSpans: [], suspectSpeaker: false, analyzedAt: 0 };
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({
      triageBySegment: { [triageKey('s1', triage.textHash)]: triage },
    }));
    const heard: string[] = [];
    const listener = (event: Event) => heard.push((event as CustomEvent<{ heard: string }>).detail.heard);
    window.addEventListener(FIX_WORD_EVENT, listener);
    try {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: 'Review: framna' }));
      expect(heard).toEqual(['framna']);
    } finally {
      window.removeEventListener(FIX_WORD_EVENT, listener);
    }
  });
});
