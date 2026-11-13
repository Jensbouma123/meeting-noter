import { fireEvent, render, screen } from '@testing-library/react';
import { SpeakerAssign } from './SpeakerAssign';
import type { SpeakerAssignProps } from './SpeakerAssign.types';
import { setParticipants } from '@/lib/meeting/participants';
import { resetVocabularyForTests } from '@/lib/vocabulary/store';
import { LanguageContext } from '@/lib/i18n/LanguageContext';

export function renderSpeakerAssign(label: string, extra: Partial<SpeakerAssignProps> = {}) {
  render(
    <LanguageContext.Provider value="en">
      <SpeakerAssign sessionId="s1" speakerId="2" label={label} source="system" otherLabels={['Anna']} {...extra} />
    </LanguageContext.Provider>,
  );
}

export const openAssignMenu = () => fireEvent.click(screen.getByTestId('speaker-assign'));

export function resetSpeakerAssignState() {
  localStorage.clear();
  resetVocabularyForTests();
  setParticipants('s1', ['Anna', 'Jan']);
}

export function typeSomeoneElse(name: string) {
  openAssignMenu();
  fireEvent.click(screen.getByText('Someone else…'));
  const input = screen.getByLabelText('Someone else…');
  fireEvent.change(input, { target: { value: name } });
  return input;
}
