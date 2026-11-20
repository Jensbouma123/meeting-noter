import type { AskLanguage, AskPresetId } from './types';

export const ASK_PRESET_IDS: readonly AskPresetId[] = ['summary', 'decisions', 'actions', 'all', 'cleanup'];

const INSTRUCTIONS: Record<AskLanguage, Record<AskPresetId, string>> = {
  en: {
    summary: 'Summarise this meeting in a few short paragraphs: the purpose, the main points discussed and the outcome.',
    decisions: 'List every decision made in this meeting. For each one, say who decided it and why, if the transcript says so.',
    actions:
      'List every action item from this meeting as a checklist: what needs to happen, who owns it and the deadline, if the transcript says so.',
    all: 'Write meeting notes with three sections: 1. Summary (a few short paragraphs), 2. Decisions (a list, with who decided), 3. Action items (a checklist with owner and deadline, if known).',
    cleanup:
      'Clean up this transcript: fix punctuation, capitalisation and obvious speech-recognition errors, remove filler words and false starts, and keep the speaker labels. Do not summarise or leave anything out.',
  },
  nl: {
    summary:
      'Vat deze meeting samen in een paar korte alinea’s: het doel, de belangrijkste besproken punten en de uitkomst.',
    decisions: 'Noem alle besluiten die in deze meeting zijn genomen. Zeg bij elk besluit wie het nam en waarom, als dat in het transcript staat.',
    actions:
      'Zet alle actiepunten uit deze meeting in een checklist: wat er moet gebeuren, wie het oppakt en de deadline, als dat in het transcript staat.',
    all: 'Schrijf notulen met drie onderdelen: 1. Samenvatting (een paar korte alinea’s), 2. Besluiten (een lijst, met wie besloot), 3. Actiepunten (een checklist met eigenaar en deadline, als die bekend zijn).',
    cleanup:
      'Schoon dit transcript op: verbeter interpunctie, hoofdletters en duidelijke spraakherkenningsfouten, haal stopwoorden en valse starts weg en houd de sprekerlabels. Vat niets samen en laat niets weg.',
  },
};

export function presetInstruction(preset: AskPresetId, language: AskLanguage): string {
  return INSTRUCTIONS[language][preset];
}
