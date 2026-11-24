import type { AskLanguage, AskPromptInput, AskTurn } from './types';

interface AskLabels {
  meeting: string;
  date: string;
  transcript: string;
  untitled: string;
  replyIn: string;
  replySame: string;
}

const LABELS: Record<AskLanguage, AskLabels> = {
  en: {
    meeting: 'Meeting',
    date: 'Date',
    transcript: 'Transcript',
    untitled: 'Untitled meeting',
    replyIn: 'Answer in {name}, the language of the transcript.',
    replySame: 'Answer in the same language as the transcript.',
  },
  nl: {
    meeting: 'Meeting',
    date: 'Datum',
    transcript: 'Transcript',
    untitled: 'Naamloze meeting',
    replyIn: 'Antwoord in het {name}, de taal van het transcript.',
    replySame: 'Antwoord in dezelfde taal als het transcript.',
  },
};

function replyLanguageLine(labels: AskLabels, transcriptLanguage: string | null | undefined): string {
  const name = transcriptLanguage?.trim();
  return name ? labels.replyIn.replace('{name}', name) : labels.replySame;
}

export function mergeTurns(turns: AskTurn[]): AskTurn[] {
  const merged: AskTurn[] = [];
  for (const turn of turns) {
    const text = turn.text.trim();
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === turn.speaker) last.text = `${last.text} ${text}`;
    else merged.push({ speaker: turn.speaker, text });
  }
  return merged;
}

export function buildAskPrompt({
  instruction,
  title,
  dateLabel,
  turns,
  language,
  transcriptLanguage,
}: AskPromptInput): string {
  const labels = LABELS[language];
  const header = [`${labels.meeting}: ${title.trim() || labels.untitled}`];
  if (dateLabel) header.push(`${labels.date}: ${dateLabel}`);
  const body = mergeTurns(turns).map((turn) => `${turn.speaker}: ${turn.text}`);
  const reply = replyLanguageLine(labels, transcriptLanguage);
  return [instruction.trim(), reply, '', ...header, '', `${labels.transcript}:`, ...body].join('\n');
}
