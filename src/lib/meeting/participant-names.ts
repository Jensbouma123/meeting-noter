const MAX_NAME_LENGTH = 40;

export function parseParticipantNames(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH))
    .filter(Boolean);
}

export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const clean = name.trim().replace(/\s+/g, ' ');
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

export function isUnnamedSpeakerLabel(label: string): boolean {
  return /^(speaker|spreker)(\s+\S+)?$/i.test(label.trim());
}

export function defaultSpeakerLabel(speakerId: string, source: 'mic' | 'system', youLabel: string): string {
  return source === 'mic' ? youLabel : `Speaker ${speakerId}`;
}

export function unassignedParticipants(participants: readonly string[], speakerLabels: readonly string[]): string[] {
  const used = new Set(speakerLabels.map((l) => l.trim().toLowerCase()));
  return participants.filter((p) => !used.has(p.toLowerCase()));
}
