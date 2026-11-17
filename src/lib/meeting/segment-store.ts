import { applyVocabularyToSegment } from '@/lib/vocabulary/replace';
import { getPreparedVocabulary } from '@/lib/vocabulary/store';
import { getActiveAppend } from './append-mode';
import { segmentFamilyRoot } from './speaker-family';
import { ensureSpeaker } from './speaker-registry';
import { getState, setState } from './store-core';
import type { Segment } from './types';

function withVocabulary(seg: Segment): Segment {
  return seg.final ? applyVocabularyToSegment(seg, getPreparedVocabulary()) : seg;
}

function shiftWords(words: Segment['words'], offset: number): Segment['words'] {
  return words?.map((w) => ({ ...w, start: w.start + offset, end: w.end + offset }));
}

function shiftIntoAppend(seg: Segment, prefix: string, offset: number): Segment {
  return {
    ...seg,
    id: prefix + seg.id,
    start: seg.start + offset,
    end: seg.end + offset,
    words: shiftWords(seg.words, offset),
  };
}

export function applyVocabularyToTranscript(): void {
  let changed = false;
  const segments = getState().segments.map((s) => {
    const next = withVocabulary(s);
    if (next !== s) changed = true;
    return next;
  });
  if (!changed) return;
  setState({ segments });
}

export function upsertSegment(seg: Segment): void {
  seg = withVocabulary(seg);
  const append = getActiveAppend();
  if (append && !seg.id.startsWith(append.prefix)) {
    seg = shiftIntoAppend(seg, append.prefix, append.offset);
  }
  ensureSpeaker(seg.speaker, getState().mode);
  const current = getState().segments;
  const idx = current.findIndex((s) => s.id === seg.id);
  let segments: Segment[];
  if (idx >= 0) {
    if (current[idx] === seg) return;
    segments = current.slice();
    segments[idx] = seg;
  } else {
    segments = current.concat(seg);
  }
  setState({ segments });
}

export function confirmAllSegments(): void {
  const current = getState().segments;
  if (!current.some((s) => s.unconfirmed)) return;
  const segments = current.map((s) => {
    if (!s.unconfirmed) return s;
    const rest = { ...s };
    delete rest.unconfirmed;
    return rest;
  });
  setState({ segments });
}

export function inSegmentFamily(id: string, root: string): boolean {
  return id === root || id.startsWith(`${root}~`);
}

export function replaceSegmentFamily(root: string, parts: Segment[]): void {
  if (parts.length === 0) return;
  let placed = parts.map(withVocabulary);
  const append = getActiveAppend();
  if (append && !root.startsWith(append.prefix)) {
    root = append.prefix + root;
    placed = parts.map((part) => shiftIntoAppend(part, append.prefix, append.offset));
  }
  const { segments: current, mode } = getState();
  const family = current.filter((s) => inSegmentFamily(s.id, root));
  if (family.length === placed.length && family.every((s, i) => s === placed[i])) return;
  for (const part of placed) ensureSpeaker(part.speaker, mode);
  const stored = getState().segments;
  const at = stored.findIndex((s) => inSegmentFamily(s.id, root));
  const rest = stored.filter((s) => !inSegmentFamily(s.id, root));
  const index = at < 0 ? rest.length : at;
  setState({ segments: [...rest.slice(0, index), ...placed, ...rest.slice(index)] });
}

function placeFamily(root: string, parts: Segment[]): [string, Segment[]] {
  const append = getActiveAppend();
  if (append && !root.startsWith(append.prefix)) {
    return [append.prefix + root, parts.map((part) => shiftIntoAppend(part, append.prefix, append.offset))];
  }
  return [root, parts.map(withVocabulary)];
}

export function replaceSegmentFamilies(entries: ReadonlyArray<readonly [string, Segment[]]>): void {
  const pending = new Map<string, Segment[]>();
  for (const [root, parts] of entries) {
    if (parts.length === 0) continue;
    const [placedRoot, placed] = placeFamily(root, parts);
    pending.set(placedRoot, placed);
  }
  if (pending.size === 0) return;
  const { segments: current, mode } = getState();
  const existing = new Map<string, Segment[]>();
  for (const seg of current) {
    const root = segmentFamilyRoot(seg.id);
    if (pending.has(root)) existing.set(root, [...(existing.get(root) ?? []), seg]);
  }
  for (const [root, placed] of pending) {
    const family = existing.get(root) ?? [];
    if (family.length === placed.length && family.every((s, i) => s === placed[i])) pending.delete(root);
  }
  if (pending.size === 0) return;
  for (const placed of pending.values()) for (const part of placed) ensureSpeaker(part.speaker, mode);
  const emitted = new Set<string>();
  const next: Segment[] = [];
  for (const seg of getState().segments) {
    const root = segmentFamilyRoot(seg.id);
    const placed = pending.get(root);
    if (!placed) next.push(seg);
    else if (!emitted.has(root)) {
      emitted.add(root);
      next.push(...placed);
    }
  }
  for (const [root, placed] of pending) if (!emitted.has(root)) next.push(...placed);
  setState({ segments: next });
}
