// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSegmentText, triageKey, useSessionIntelligence } from '@/lib/d1/store';
import { runD1AnalysisForSession } from '@/lib/meeting/d1-bridge';
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
