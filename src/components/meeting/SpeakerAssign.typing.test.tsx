// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getParticipants } from '@/lib/meeting/participants';
import { meeting } from './store';
import { openAssignMenu as open, renderSpeakerAssign as view, resetSpeakerAssignState, typeSomeoneElse } from './SpeakerAssign.testUtils';

vi.mock('./store', () => ({ meeting: { renameSpeaker: vi.fn() } }));

const renameSpeaker = vi.mocked(meeting.renameSpeaker);

beforeEach(() => {
  renameSpeaker.mockClear();
  resetSpeakerAssignState();
});
afterEach(cleanup);

describe('SpeakerAssign typing a name', () => {
  it('"Someone else…" types a name and adds it to the participants', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('Noor');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Noor');
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan', 'Noor']);
  });

  it('"Edit name…" opens the input pre-filled with the current name', () => {
    view('Jan');
    open();
    fireEvent.click(screen.getByText('Edit name…'));
    const input = screen.getByLabelText('Someone else…');
    expect(input).toHaveValue('Jan');
    fireEvent.change(input, { target: { value: 'Jann' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Jann');
  });

  it('Enter renames once, not again when the field closes', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('Noor');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).toHaveBeenCalledTimes(1);
  });

  it('Escape cancels the typed name without renaming', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('Noor');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(renameSpeaker).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Someone else…')).toBeNull();
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
  });

  it('a blank name is not assigned, on Enter or on blur', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('   ');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(renameSpeaker).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Someone else…')).toBeNull();
  });

  it('a typed name that is a participant in another case does not add a second entry', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('anna');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
  });

  it('blur with a typed name assigns it', () => {
    view('Speaker 2');
    const input = typeSomeoneElse('Noor');
    fireEvent.blur(input);
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Noor');
  });
});
