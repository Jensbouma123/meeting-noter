// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NotesPanel } from './NotesPanel';
import { addAction, getNotes } from '@/lib/meeting/notes';
import { notesKey } from '@/lib/meeting/notes-storage';
import type { Segment } from '@/lib/meeting/types';

describe('NotesPanel', () => {
  const sessionId = 'notes-panel-test';
  afterEach(() => { cleanup(); window.localStorage.removeItem(notesKey(sessionId)); });

  it('shows no input until Add is clicked, Enter saves, Escape cancels', () => {
    render(<NotesPanel sessionId={sessionId} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('No action items yet.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add action item' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Add action item' }), { target: { value: 'Send the follow-up' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add action item' }), { key: 'Enter' });
    expect(getNotes(sessionId).actions).toMatchObject([{ text: 'Send the follow-up', done: false }]);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Action items (1)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Add decision' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Add decision' }), { target: { value: 'nope' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add decision' }), { key: 'Escape' });
    expect(getNotes(sessionId).decisions).toHaveLength(0);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('toggles an action complete via its checkbox', () => {
    addAction(sessionId, 'Send the follow-up');
    render(<NotesPanel sessionId={sessionId} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Send the follow-up' }));
    expect(getNotes(sessionId).actions[0].done).toBe(true);
  });

  it('edits action text inline', () => {
    addAction(sessionId, 'Old text');
    render(<NotesPanel sessionId={sessionId} />);
    fireEvent.click(screen.getByText('Old text'));
    const input = screen.getByRole('textbox', { name: 'Edit' });
    fireEvent.change(input, { target: { value: 'New text' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getNotes(sessionId).actions[0].text).toBe('New text');
  });

  it('collapses suggestions, then adds or dismisses a full-sentence one', () => {
    const seg = (id: string, text: string): Segment => ({ id, text, speakerId: 's', startMs: 0, endMs: 1 } as unknown as Segment);
    render(<NotesPanel sessionId={sessionId} segments={[
      seg('a', "I'll send the action item tomorrow."), seg('b', 'Graag even doen.'),
    ]} />);
    const toggle = screen.getByRole('button', { name: 'Suggestions (1)' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: /Add suggestion/ })).toBeNull();
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /Dismiss suggestion/ }));
    expect(screen.queryByRole('button', { name: /Suggestions/ })).toBeNull();
    expect(getNotes(sessionId).decisions).toHaveLength(0);
  });
});
