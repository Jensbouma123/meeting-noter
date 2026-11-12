// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Segment } from '@/lib/meeting';
import type { SegmentTriage } from '@/lib/meeting/types';
import { FIX_WORD_EVENT, type D1SegmentView } from './d1-view';
import { TranscriptTurn } from './TranscriptTurn';

const seg: Segment = {
  id: 's1', source: 'mic', speaker: 'sp1', text: 'We ship on Friday with framna', start: 3, end: 5, final: true,
  lowConfSpans: [[23, 29, 0.4]],
};

const triage: SegmentTriage = {
  segmentId: 's1', textHash: 'h', reviewedSpans: [], suspectSpeaker: true, analyzedAt: 0,
};

const renderTurn = (d1: D1SegmentView | undefined, segment: Segment = seg) => render(
  <TranscriptTurn
    segment={segment}
    speakerLabel="Ann"
    speakerColorIndex={0}
    actions={{ createAction: vi.fn(), markDecision: vi.fn() }}
    d1={d1}
  />,
);

afterEach(() => cleanup());

describe('TranscriptTurn D1 marks', () => {
  it('shows tag badges, a review chip and a speaker hint', () => {
    renderTurn({ triage, tags: ['decision', 'action_item'] });
    expect(screen.getByText('Decision')).toBeTruthy();
    expect(screen.getByText('Action item')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Review word: framna' })).toBeTruthy();
    expect(screen.getByText('check speaker')).toBeTruthy();
  });

  it('dispatches a fix-word event from the review chip', () => {
    const heard: string[] = [];
    const listener = (event: Event) => heard.push((event as CustomEvent<{ heard: string }>).detail.heard);
    window.addEventListener(FIX_WORD_EVENT, listener);
    try {
      renderTurn({ triage, tags: [] });
      fireEvent.click(screen.getByRole('button', { name: 'Review word: framna' }));
      expect(heard).toEqual(['framna']);
    } finally {
      window.removeEventListener(FIX_WORD_EVENT, listener);
    }
  });

  it('shows no D1 marks without results, and no tags on a line still being transcribed', () => {
    renderTurn(undefined);
    expect(screen.queryByText('Decision')).toBeNull();
    expect(screen.queryByText('check speaker')).toBeNull();
    cleanup();

    renderTurn({ triage, tags: ['decision'] }, { ...seg, final: false });
    expect(screen.queryByText('Decision')).toBeNull();
    expect(screen.queryByText('check speaker')).toBeNull();
  });
});
