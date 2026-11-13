import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Segment } from './types';
import { addAction, addDecision, getNotes, openCount, removeAction, removeDecision, updateAction } from './notes';
import { notesKey, subscribe } from './notes-storage';
import { suggestFromSegments } from './note-suggestions';

function installStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
  vi.stubGlobal('window', { localStorage: storage });
  return { data, storage };
}

const seg = (id: string, text: string): Segment => ({
  id, text, source: 'mic', speaker: 'mic:0', start: 0, end: 1, final: true,
});

describe('meeting notes', () => {
  beforeEach(() => installStorage());
  afterEach(() => vi.unstubAllGlobals());

  it('creates, updates, removes notes, persists them, and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribe('session', listener);
    const action = addAction('session', 'Send the deck', { ownerName: 'Sam', due: '2026-11-12', sourceSegmentId: 's1' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(action).toMatchObject({ text: 'Send the deck', ownerName: 'Sam', due: '2026-11-12', done: false, sourceSegmentId: 's1' });
    expect(getNotes('session').actions).toEqual([action]);
    expect(openCount('session')).toBe(1);

    updateAction('session', action.id, { done: true, text: 'Send the updated deck' });
    expect(getNotes('session').actions[0]).toMatchObject({ done: true, text: 'Send the updated deck' });
    expect(openCount('session')).toBe(0);
    removeAction('session', action.id);
    const decision = addDecision('session', 'Ship on Friday', 's2');
    expect(getNotes('session').decisions).toEqual([decision]);
    removeDecision('session', decision.id);
    expect(getNotes('session')).toEqual({ actions: [], decisions: [] });
    expect(listener).toHaveBeenCalledTimes(5);
    unsubscribe();
    addAction('session', 'No longer observed');
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it('uses the required per-session storage key', () => {
    addAction('abc', 'Follow up');
    expect(notesKey('abc')).toBe('mn.notes.v1.abc');
    expect(window.localStorage.getItem('mn.notes.v1.abc')).not.toBeNull();
  });

  it('silently treats corrupt JSON as empty and replaces it on the next write', () => {
    window.localStorage.setItem(notesKey('bad'), '{not json');
    expect(getNotes('bad')).toEqual({ actions: [], decisions: [] });
    addDecision('bad', 'Recovered');
    expect(getNotes('bad').decisions).toHaveLength(1);
  });

  it('suggests NL and EN cue lines and skips neutral text', () => {
    const suggestions = suggestFromSegments([
      seg('nl', 'Actiepunt: ik pak de planning op.'),
      seg('en', "I'll send the action item tomorrow."),
      seg('neutral', 'We had a useful conversation today.'),
    ]);
    expect(suggestions).toHaveLength(2);
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'Actiepunt: ik pak de planning op.', sourceSegmentId: 'nl' }),
      expect.objectContaining({ text: "I'll send the action item tomorrow.", sourceSegmentId: 'en' }),
    ]));
    expect(getNotes('session')).toEqual({ actions: [], decisions: [] });
  });

  it('matches Dutch and English decision cues without suggesting neutral lines', () => {
    expect(suggestFromSegments([
      seg('nl', 'We besluiten om maandag te starten.'),
      seg('en', 'Agreed, we will start Monday.'),
      seg('neutral', 'Monday is the first day of the week.'),
    ])).toHaveLength(2);
  });

  it('ignores fragments under 5 words and dedupes repeated sentences', () => {
    const out = suggestFromSegments([
      seg('1', 'Graag even.'),
      seg('2', 'Graag de planning nog even doen.'),
      seg('3', 'graag de planning nog even doen.'),
    ]);
    expect(out.map((item) => item.sourceSegmentId)).toEqual(['2']);
  });
});
