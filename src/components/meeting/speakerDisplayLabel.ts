const NUMBERED_SPEAKER = /^(?:speaker|spreker)\s+(\d+)$/i;

export function speakerDisplayLabel(label: string, numberedTemplate: string): string {
  const match = NUMBERED_SPEAKER.exec(label.trim());
  return match ? numberedTemplate.replace('{n}', match[1]) : label;
}
