import { getState, setState } from './store-core';
import type { CaptureMode, Source, Speaker } from './types';

const SPEAKER_COLOR_COUNT = 8;

function parseSpeakerId(id: string): { source: Source; index: number } | null {
  const sep = id.indexOf(':');
  if (sep < 0) return null;
  const source = id.slice(0, sep);
  if (source !== 'mic' && source !== 'system') return null;
  const index = Number(id.slice(sep + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { source, index };
}

function isLocalUser(parsed: { source: Source; index: number } | null, mode: CaptureMode, callAudioMissing: boolean): boolean {
  return parsed?.source === 'mic' && parsed.index === 0 && mode === 'both' && !callAudioMissing;
}

export function defaultLabel(id: string, mode: CaptureMode, callAudioMissing = false): string {
  const parsed = parseSpeakerId(id);
  if (!parsed) return id;
  if (isLocalUser(parsed, mode, callAudioMissing)) return 'You';
  return `Speaker ${parsed.index + 1}`;
}

export function ensureSpeaker(id: string, mode: CaptureMode): Speaker {
  const { speakers, callAudioMissing } = getState();
  const existing = speakers[id];
  if (existing) return existing;
  const parsed = parseSpeakerId(id);
  const known = Object.values(speakers);
  const isYou = isLocalUser(parsed, mode, callAudioMissing);
  const others = known.filter((s) => !(s.id === 'mic:0' && mode === 'both' && !callAudioMissing)).length;
  const speaker: Speaker = {
    id,
    source: parsed ? parsed.source : 'mic',
    label: parsed && !isYou ? `Speaker ${others + 1}` : defaultLabel(id, mode, callAudioMissing),
    colorIndex: known.length % SPEAKER_COLOR_COUNT,
  };
  setState({ speakers: { ...speakers, [id]: speaker } });
  return speaker;
}

export function renameSpeaker(id: string, label: string): void {
  const { speakers } = getState();
  const existing = speakers[id] ?? {
    id,
    source: 'mic' as Source,
    label: id,
    colorIndex: 0,
  };
  setState({ speakers: { ...speakers, [id]: { ...existing, label } } });
}
