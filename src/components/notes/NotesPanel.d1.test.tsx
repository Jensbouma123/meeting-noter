// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
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

  it('recovers after commit: a store notify from recovery never lands during render', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'idle', progress: { done: 0, total: 0 } }));
    let version = 0;
    const listeners = new Set<() => void>();
    vi.mocked(recoverStaleD1Run).mockImplementationOnce(() => {
      version += 1;
      for (const listener of listeners) listener();
      return Promise.resolve();
    });
    function Probe() {
      useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => version, () => 0);
      return null;
    }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(<><Probe /><NotesPanel sessionId={sessionId} speakers={speakers} segments={[segment]} /></>);
      expect(recoverStaleD1Run).toHaveBeenCalledTimes(1);
      expect(error.mock.calls.flat().join(' ')).not.toContain('Cannot update a component');
    } finally {
      error.mockRestore();
    }
  });

  it('explains a timed-out analysis', () => {
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'error', error: 'd1:timeout' }));
    renderPanel();

    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toContain('Analysis took too long and was stopped. Try again.');
  });

  it('lists a persisted speaker hint for a saved-meeting segment (DB shape: no lowConfSpans)', () => {
    const saved: Segment[] = [
      { id: 'live-4', source: 'system', speaker: 'system:0', text: 'Kijk, en dan doe je zo.', start: 13.7, end: 15.3, final: true },
      { id: 'live-4~6', source: 'system', speaker: 'system:1', text: 'Oh, dat is natuurlijk qua', start: 16.5, end: 17.7, final: true },
    ];
    const people: Speaker[] = [
      { id: 'system:0', source: 'system', label: 'Speaker 1', colorIndex: 0 },
      { id: 'system:1', source: 'system', label: 'Speaker 2', colorIndex: 1 },
    ];
    const hash = hashSegmentText(saved[1].text);
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({
      triageBySegment: { [triageKey('live-4~6', hash)]: { segmentId: 'live-4~6', textHash: hash, reviewedSpans: [], suspectSpeaker: true, analyzedAt: 0 } },
    }));
    render(<NotesPanel sessionId={sessionId} speakers={people} segments={saved} />);
    fireEvent.click(screen.getByRole('button', { name: /Insights/ }));

    expect(screen.getByRole('region', { name: 'Speaker hints' }).textContent).toContain('Speaker 2');
    expect(screen.getByRole('button', { name: /Insights \(1\)/ })).toBeTruthy();
  });

  it('says a finished scan found nothing, and not for never-scanned or failed scans', () => {
    const at = new Date(2026, 10, 13, 9, 5).getTime();
    const time = new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status: 'done', updatedAt: at }));
    renderPanel();
    expect(screen.getByText(`Scanned at ${time}: nothing found.`).getAttribute('role')).toBe('status');
    cleanup();

    for (const status of ['idle', 'error'] as const) {
      vi.mocked(useSessionIntelligence).mockReturnValue(intelligence({ status, updatedAt: at, error: status === 'error' ? 'x' : null }));
      renderPanel();
      expect(screen.queryByText(/Scanned at/)).toBeNull();
      cleanup();
    }
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
