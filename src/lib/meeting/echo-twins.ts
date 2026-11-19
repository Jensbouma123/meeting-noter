import type { Segment } from './types';

const MIN_TIME_SHARE = 0.5;
const MIN_TEXT_SIMILARITY = 0.6;

function tokens(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function similarity(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const pool = new Map<string, number>();
  for (const t of b) pool.set(t, (pool.get(t) ?? 0) + 1);
  let shared = 0;
  for (const t of a) {
    const left = pool.get(t) ?? 0;
    if (left > 0) {
      shared += 1;
      pool.set(t, left - 1);
    }
  }
  return (2 * shared) / (a.length + b.length);
}

function timeShare(a: Segment, b: Segment): number {
  const shared = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  return shared / Math.max(1e-6, Math.min(a.end - a.start, b.end - b.start));
}

function isEchoOf(mic: Segment, system: Segment): boolean {
  if (mic.echo === 'speech') return false;
  const share = timeShare(mic, system);
  if (mic.echo === 'echo') return share > 0;
  return share >= MIN_TIME_SHARE && similarity(tokens(mic.text), tokens(system.text)) >= MIN_TEXT_SIMILARITY;
}

export function dropEchoTwins<T extends Segment>(segments: readonly T[]): T[] {
  const system = segments.filter((s) => s.source === 'system' && s.end > s.start);
  if (!system.length) return [...segments];
  return segments.filter((s) => s.source !== 'mic' || s.end <= s.start || !system.some((o) => isEchoOf(s, o)));
}
