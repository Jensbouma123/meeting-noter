import type { AskLanguage, AskPromptInput, AskTurn } from "./types";

const LABELS: Record<
  AskLanguage,
  { meeting: string; date: string; transcript: string; untitled: string }
> = {
  en: {
    meeting: "Meeting",
    date: "Date",
    transcript: "Transcript",
    untitled: "Untitled meeting",
  },
  nl: {
    meeting: "Meeting",
    date: "Datum",
    transcript: "Transcript",
    untitled: "Naamloze meeting",
  },
};

export function mergeTurns(turns: AskTurn[]): AskTurn[] {
  const merged: AskTurn[] = [];
  for (const turn of turns) {
    const text = turn.text.trim();
    if (!text) continue;
    const last = merged[merged.length - 1];
    if (last && last.speaker === turn.speaker)
      last.text = `${last.text} ${text}`;
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
}: AskPromptInput): string {
  const labels = LABELS[language];
  const header = [`${labels.meeting}: ${title.trim() || labels.untitled}`];
  if (dateLabel) header.push(`${labels.date}: ${dateLabel}`);
  const body = mergeTurns(turns).map((turn) => `${turn.speaker}: ${turn.text}`);
  return [
    instruction.trim(),
    "",
    ...header,
    "",
    `${labels.transcript}:`,
    ...body,
  ].join("\n");
}
