import type { Segment, Speaker } from './types';

export function finalSegments(segments: Segment[]): Segment[] {
  return segments
    .filter((seg) => seg.final && seg.text.trim().length > 0)
    .sort((a, b) => a.start - b.start);
}

export function resolveSpeakerLabel(
  seg: Segment,
  speakers: Record<string, Speaker>,
  callAudioMissing = false,
): string {
  return speakers[seg.speaker]?.label ?? (seg.source === 'mic' && !callAudioMissing ? 'You' : 'Speaker');
}

export function pad(n: number, len = 2): string {
  return Math.floor(Math.max(0, n)).toString().padStart(len, '0');
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
}

export function formatSrtTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(sec)},${ms.toString().padStart(3, '0')}`;
}

export function tidyText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function clockTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
