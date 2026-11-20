const NUMBERED_SPEAKER = /^(?:speaker|spreker)\s+(\d+)$/i;

/** Shows a numbered default label ("Speaker 2") in the UI language; any other label is left as typed. */
export function speakerDisplayLabel(label: string, numberedTemplate: string): string {
  const match = NUMBERED_SPEAKER.exec(label.trim());
  return match ? numberedTemplate.replace('{n}', match[1]) : label;
}
