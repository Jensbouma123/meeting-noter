// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NotesPanel } from './NotesPanel';
import { getNotes, notesKey } from '@/lib/meeting/notes';

describe('NotesPanel', () => {
  const sessionId = 'notes-panel-test';
  afterEach(() => window.localStorage.removeItem(notesKey(sessionId)));

  it('adds an action and toggles it complete', () => {
    render(<NotesPanel sessionId={sessionId} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Add action item' }), {
      target: { value: 'Send the follow-up' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add action item' }));

    expect(getNotes(sessionId).actions).toHaveLength(1);
    expect(screen.getByText('Send the follow-up')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));
    expect(getNotes(sessionId).actions[0].done).toBe(true);
    expect(screen.getByRole('button', { name: 'Mark as open' }).getAttribute('aria-pressed')).toBe('true');
  });
});
