// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeakerAssign } from './SpeakerAssign';
import { meeting } from './store';
import { openAssignMenu as open, renderSpeakerAssign as view, resetSpeakerAssignState, typeSomeoneElse } from './SpeakerAssign.testUtils';

vi.mock('./store', () => ({ meeting: { renameSpeaker: vi.fn() } }));

const renameSpeaker = vi.mocked(meeting.renameSpeaker);

beforeEach(() => {
  renameSpeaker.mockClear();
  resetSpeakerAssignState();
});
afterEach(cleanup);

describe('SpeakerAssign', () => {
  it('shows "Who is this?" for an unnamed speaker and assigns a participant in one click', () => {
    view('Speaker 2');
    expect(screen.getByTestId('speaker-assign')).toHaveTextContent('Who is this?');
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
