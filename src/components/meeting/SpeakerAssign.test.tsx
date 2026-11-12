// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeakerAssign } from './SpeakerAssign';
import { getParticipants, setParticipants } from '@/lib/meeting/participants';
import { resetVocabularyForTests } from '@/lib/vocabulary/store';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

const renameSpeaker = vi.fn();
vi.mock('./store', () => ({ meeting: { renameSpeaker: (...a: unknown[]) => renameSpeaker(...a) } }));

function view(label: string, extra: Partial<Parameters<typeof SpeakerAssign>[0]> = {}) {
  render(
    <LanguageContext.Provider value="en">
      <SpeakerAssign sessionId="s1" speakerId="2" label={label} source="system" otherLabels={['Anna']} {...extra} />
    </LanguageContext.Provider>,
  );
}
const open = () => fireEvent.click(screen.getByTestId('speaker-assign'));

beforeEach(() => {
  localStorage.clear();
  // The word list is cached in memory: reset it so names from an earlier test do not count as known.
  resetVocabularyForTests();
  renameSpeaker.mockClear();
  setParticipants('s1', ['Anna', 'Jan']);
});
afterEach(cleanup);

describe('SpeakerAssign', () => {
  it('shows "Who is this?" for an unnamed speaker and assigns a participant in one click', () => {
    view('Speaker 2');
    expect(screen.getByTestId('speaker-assign')).toHaveTextContent('Who is this?');
    open();
    expect(screen.getByText('not yet assigned')).toBeInTheDocument(); // Jan; Anna is taken
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

  it('"Someone else…" types a name and adds it to the participants', () => {
    view('Speaker 2');
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'Noor' } });
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
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'Noor' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).toHaveBeenCalledTimes(1);
  });

  it('Escape cancels the typed name without renaming', () => {
    view('Speaker 2');
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'Noor' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(renameSpeaker).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Someone else…')).toBeNull();
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
  });

  it('a blank name is not assigned, on Enter or on blur', () => {
    view('Speaker 2');
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(renameSpeaker).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(renameSpeaker).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Someone else…')).toBeNull();
  });

  it('a typed name that is a participant in another case does not add a second entry', () => {
    view('Speaker 2');
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'anna' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(getParticipants('s1')).toEqual(['Anna', 'Jan']);
  });

  it('blur with a typed name assigns it', () => {
    view('Speaker 2');
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'Noor' } });
    fireEvent.blur(input);
    expect(renameSpeaker).toHaveBeenCalledWith('2', 'Noor');
  });

  it('an unnamed speaker has no Clear or Edit entries', () => {
    view('Speaker 2');
    open();
    expect(screen.queryByText('Clear name')).toBeNull();
    expect(screen.queryByText('Edit name…')).toBeNull();
  });

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
    open();
    fireEvent.click(screen.getByText('Someone else…'));
    const input = screen.getByLabelText('Someone else…');
    fireEvent.change(input, { target: { value: 'Noor' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAssigned).toHaveBeenLastCalledWith(1);
  });

  it('reports 0 when the assigned name is already on the word list', () => {
    const onAssigned = vi.fn();
    view('Speaker 2', { onAssigned }); // "Jan" was added to the word list by beforeEach
    open();
    fireEvent.click(screen.getByText('Jan'));
    expect(onAssigned).toHaveBeenLastCalledWith(0);
  });
});
