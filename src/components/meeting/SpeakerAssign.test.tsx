// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { meeting } from './store';
import {
  openAssignMenu as open,
  renderSpeakerAssign as view,
  resetSpeakerAssignState,
} from './SpeakerAssign.testUtils';

vi.mock('./store', () => ({ meeting: { renameSpeaker: vi.fn() } }));

const renameSpeaker = vi.mocked(meeting.renameSpeaker);

beforeEach(() => {
  renameSpeaker.mockClear();
  resetSpeakerAssignState();
});
afterEach(cleanup);

describe('SpeakerAssign', () => {
  it('shows an unnamed speaker by label with a visible pencil and assigns a participant in one click', () => {
    view('Speaker 2');
    const trigger = screen.getByTestId('speaker-assign');
    expect(trigger).toHaveTextContent('Speaker 2');
    expect(trigger).toHaveAccessibleName('Who is this? (Speaker 2)');
    expect(trigger.querySelector('[data-speaker-edit]')!.getAttribute('class')).toContain('opacity-70');
    open();
    expect(screen.getByText('not yet assigned')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Jan'));
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Jan');
  });

  it('reassigns a named speaker to someone else from the list', () => {
    view('Jan');
    expect(screen.getByTestId('speaker-assign')).toHaveTextContent('Jan');
    open();
    fireEvent.click(screen.getByText('Anna'));
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Anna');
  });

  it('clears the name back to the default label', () => {
    view('Jan');
    open();
    fireEvent.click(screen.getByText('Clear name'));
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Speaker 2');
  });

  it('an unnamed speaker has no Clear or Edit entries', () => {
    view('Speaker 2');
    open();
    expect(screen.queryByText('Clear name')).toBeNull();
    expect(screen.queryByText('Edit name…')).toBeNull();
  });
});
