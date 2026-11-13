// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { meeting } from './store';
import { openAssignMenu as open, renderSpeakerAssign as view, resetSpeakerAssignState, typeSomeoneElse } from './SpeakerAssign.testUtils';

vi.mock('./store', () => ({ meeting: { renameSpeaker: vi.fn() } }));

const renameSpeaker = vi.mocked(meeting.renameSpeaker);

beforeEach(() => {
  renameSpeaker.mockClear();
  resetSpeakerAssignState();
});
afterEach(cleanup);

describe('SpeakerAssign appearance and reporting', () => {
  it('rail appearance shows a neutral "Who is this?" button for an unnamed speaker', () => {
    view('Speaker 2', { appearance: 'rail' });
    const trigger = screen.getByTestId('speaker-assign');
    expect(trigger).toHaveTextContent('Who is this?');
    expect(trigger.className).not.toMatch(/text-primary/);
  });

  it('rail appearance shows a named speaker as a change trigger with its name', () => {
    view('Jan', { appearance: 'rail' });
    expect(screen.getByRole('button', { name: 'Change who this is: Jan' })).toBeInTheDocument();
  });

  it('reports how many names were newly added to the word list', () => {
    const onAssigned = vi.fn();
    view('Speaker 2', { onAssigned });
    const input = typeSomeoneElse('Noor');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAssigned).toHaveBeenLastCalledWith(1);
  });

  it('reports 0 when the assigned name is already on the word list', () => {
    const onAssigned = vi.fn();
    view('Speaker 2', { onAssigned });
    open();
    fireEvent.click(screen.getByText('Jan'));
    expect(onAssigned).toHaveBeenLastCalledWith(0);
  });
});
