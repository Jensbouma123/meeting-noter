// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Segment } from '@/lib/meeting';
import { addAction, addDecision, getNotes, notesKey } from '@/lib/meeting/notes';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { LiveTranscript } from './LiveTranscript';
import { TranscriptTurn } from './TranscriptTurn';

const seg: Segment = { id: 's1', source: 'mic', speaker: 'sp1', text: 'We ship on Friday', start: 3, end: 5, final: true };
const sessionId = 'turn-actions-test';

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(notesKey(sessionId));
});

describe('TranscriptTurn note actions', () => {
  it('runs the handlers from real buttons and shows feedback', () => {
    const createAction = vi.fn();
    const markDecision = vi.fn();
    render(
      <TranscriptTurn segment={seg} speakerLabel="Ann" speakerColorIndex={0} actions={{ createAction, markDecision }} />,
    );

    const action = screen.getByRole('button', { name: 'Create action item' });
    const decision = screen.getByRole('button', { name: 'Mark as decision' });
    expect(action.tagName).toBe('BUTTON');
    expect(screen.getByRole('status').textContent).toBe('');

    fireEvent.click(action);
    expect(createAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Added to action items');

    fireEvent.click(decision);
    expect(markDecision).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Added to decisions');
  });

  it('hides the controls on a line that is still being transcribed', () => {
    render(
      <TranscriptTurn
        segment={{ ...seg, final: false }}
        speakerLabel="Ann"
        speakerColorIndex={0}
        actions={{ createAction: vi.fn(), markDecision: vi.fn() }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Create action item' })).toBeNull();
  });
});

describe('transcript to Summary panel', () => {
  const live = () => (
    <LiveTranscript
      sessionId={sessionId}
      segments={[seg]}
      speakers={{}}
      status="live"
      autoScrollEnabled={false}
      onStartRecording={() => {}}
      modelReady
      onOpenSettings={() => {}}
    />
  );

  it('clicking Create action item stores it and the notes panel lists it', () => {
    render(live());
    fireEvent.click(screen.getByRole('button', { name: 'Create action item' }));
    expect(getNotes(sessionId).actions).toMatchObject([{ text: seg.text, sourceSegmentId: 's1', done: false }]);

    render(<NotesPanel sessionId={sessionId} />);
    expect(screen.getByText(seg.text)).toBeTruthy();
  });

  it('clicking Mark as decision stores it and the notes panel lists it', () => {
    render(live());
    fireEvent.click(screen.getByRole('button', { name: 'Mark as decision' }));
    expect(getNotes(sessionId).decisions).toMatchObject([{ text: seg.text, sourceSegmentId: 's1' }]);

    render(<NotesPanel sessionId={sessionId} />);
    expect(screen.getByText(seg.text)).toBeTruthy();
  });

  it('notes lib adds items that persist', () => {
    addAction(sessionId, 'a');
    addDecision(sessionId, 'd');
    expect(getNotes(sessionId)).toMatchObject({ actions: [{ text: 'a' }], decisions: [{ text: 'd' }] });
  });
});
