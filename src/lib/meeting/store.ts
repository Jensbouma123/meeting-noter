import { INITIAL_STATE } from './initial-state';
import type { CaptureMode, Levels, MeetingState, Segment, Source, Speaker } from './types';
import { useSyncExternalStore } from 'react';
import { applyVocabularyToSegment } from '@/lib/vocabulary/replace';
import { getPreparedVocabulary } from '@/lib/vocabulary/store';

let state: MeetingState = { ...INITIAL_STATE, segments: [], speakers: {} };

const listeners = new Set<() => void>();

// Coalesce bursts (e.g. partial re-transcriptions at ~2-3 Hz per source)
// into one React re-render per animation frame.
let emitQueued = false;

function flushEmit(): void {
  for (const fn of listeners) fn();
}

function emit(): void {
  if (emitQueued) return;
  emitQueued = true;
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      emitQueued = false;
      flushEmit();
    });
  } else {
    // SSR / non-DOM runtimes: notify synchronously.
    emitQueued = false;
    flushEmit();
  }
}

/** Current snapshot (stable reference until the next mutation). */
export function getState(): MeetingState {
  return state;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ------------------------------------------------------------------ */
/* useSpeakerStats — precomputed talk-time per speaker (derived from    */
/* segments + speakers in the store).                                   */
/* ------------------------------------------------------------------ */

export interface SpeakerStat {
  id: string;
  label: string;
  time: number;
  percentage: number;
  colorIndex: number;
  source: Source;
}

export function computeSpeakerStats(
  segments: Segment[],
  speakers: Record<string, Speaker>
): SpeakerStat[] {
  const times: Record<string, number> = {};

  for (const seg of segments) {
    const dur = Math.max(0, seg.end - seg.start);
    times[seg.speaker] = (times[seg.speaker] ?? 0) + dur;
  }

  const totalTime = Object.values(times).reduce((acc, t) => acc + t, 0);

  const allIds = Array.from(
    new Set([...Object.keys(speakers), ...Object.keys(times)])
  );

  return allIds.map((id) => {
    const info = speakers[id] ?? {
      id,
      source: (id.startsWith('mic') ? 'mic' : 'system') as Source,
      label: id.startsWith('mic') ? 'You' : `Speaker ${id}`,
      colorIndex: id.startsWith('mic') ? 0 : 1,
    };
    const time = times[id] ?? 0;
    const percentage = totalTime > 0 ? (time / totalTime) * 100 : 0;
    return {
      ...info,
      time,
      percentage,
    };
  });
}

/** React hook that subscribes to speaker stats from the store. */
export function useSpeakerStats(): SpeakerStat[] {
  const s = useSyncExternalStore(subscribe, getState, getState);
  return computeSpeakerStats(s.segments, s.speakers);
}

export function setState(partial: Partial<MeetingState>): void {
  state = { ...state, ...partial };
  emit();
}

/**
 * Append mode: a new recording continues the transcript already in the store
 * instead of replacing it. `armAppend` stages it; the next `resetSession`
 * (called by `meeting.start`) keeps the segments/speakers and activates it.
 * While active, `upsertSegment` shifts capture-clock times by the previous
 * duration and namespaces ids (the capture restarts its id counters).
 */
let pendingAppend = false;
let activeAppend: { offset: number; prefix: string } | null = null;
let appendEpoch = 0;

/** Seconds spanned by a transcript: the latest segment end (0 when empty). */
function transcriptEnd(segments: Segment[]): number {
  let end = 0;
  for (const s of segments) if (s.end > end) end = s.end;
  return end;
}

/** Stage append mode for the next `resetSession`. Needs a transcript in the store. */
export function armAppend(): boolean {
  if (state.segments.length === 0) return false;
  pendingAppend = true;
  return true;
}

/** Drop a staged or active append. */
export function cancelAppend(): void {
  pendingAppend = false;
  activeAppend = null;
}

/** True when the next or current recording continues the store's transcript. */
export function isAppendActive(): boolean {
  return pendingAppend || activeAppend !== null;
}

/**
 * A stored segment's span on the current recording's capture clock, which
 * speaker turns are stamped with; null for a segment of an earlier recording
 * in an appended transcript (its capture-clock times are another recording's).
 */
export function captureSpanOf(seg: Segment): { start: number; end: number } | null {
  if (!activeAppend) return { start: seg.start, end: seg.end };
  if (!seg.id.startsWith(activeAppend.prefix)) return null;
  return { start: seg.start - activeAppend.offset, end: seg.end - activeAppend.offset };
}

/**
 * A saved segment as the transcript can show it: an `overlap` that is not a
 * well-formed one is dropped (sessions saved before overlaps have none).
 */
function restoredSegment(seg: Segment): Segment {
  if (seg.overlap === undefined) return seg;
  const o = seg.overlap as Partial<Record<keyof NonNullable<Segment['overlap']>, unknown>> | null;
  const valid =
    typeof o === 'object' && o !== null &&
    typeof o.start === 'number' &&
    typeof o.end === 'number' &&
    Array.isArray(o.speakers) &&
    o.speakers.every((id) => typeof id === 'string');
  if (valid) return seg;
  const rest = { ...seg };
  delete rest.overlap;
  return rest;
}

/** Clear per-session data when a new session starts. */
export function resetSession(mode: CaptureMode): void {
  const keep = pendingAppend && state.segments.length > 0;
  pendingAppend = false;
  activeAppend = keep
    ? { offset: transcriptEnd(state.segments), prefix: `a${++appendEpoch}:` }
    : null;
  state = {
    ...state,
    mode,
    startedAt: null,
    serverReady: false,
    segments: keep ? state.segments : [],
    speakers: keep ? state.speakers : {},
    error: null,
    warning: null,
    callAudioMissing: false,
    language: null,
    stats: null,
  };
  emit();
}

/**
 * Empty the transcript for a newly created session. A recording in progress
 * keeps its data: only an idle store is cleared.
 */
export function clearIdleSession(): void {
  if (state.status !== 'idle') return;
  cancelAppend();
  resetSession(state.mode);
  transcriptSessionId = null;
}

/**
 * The session the store's transcript belongs to. The store is module-global
 * and outlives route changes, so autosave must key on this rather than the
 * route id: after navigating from A to B while A is still live or finishing
 * its post-stop transcript, the store still holds A's segments.
 */
let transcriptSessionId: string | null = null;

export function getTranscriptSessionId(): string | null {
  return transcriptSessionId;
}

/** Bind the store's transcript to a session (call before `meeting.start`). */
export function bindTranscriptSession(sessionId: string | null): void {
  pendingAppend = false;
  transcriptSessionId = sessionId;
}

/** True while a capture (or its post-stop transcription) is running. */
export function isCaptureActive(): boolean {
  return state.status !== 'idle' && state.status !== 'error';
}

/**
 * Show another session's persisted transcript, replacing the store's.
 * Refused (returns false) while a capture is active: the store then holds
 * the recording session's transcript, and replacing it would lose it.
 */
export function loadIdleSession(
  sessionId: string,
  snapshot: { segments: Segment[]; speakers: Record<string, Speaker>; startedAt: number | null } | null
): boolean {
  if (isCaptureActive()) return false;
  cancelAppend();
  const segments = snapshot && Array.isArray(snapshot.segments)
    ? snapshot.segments.filter((s) => s && typeof s.id === 'string' && s.final === true).map(restoredSegment)
    : [];
  const speakers = snapshot && snapshot.speakers && typeof snapshot.speakers === 'object'
    ? { ...snapshot.speakers }
    : {};
  state = {
    ...state,
    segments,
    speakers,
    startedAt: snapshot && typeof snapshot.startedAt === 'number' ? snapshot.startedAt : null,
    error: null,
    warning: null,
    callAudioMissing: false,
    language: null,
    stats: null,
  };
  transcriptSessionId = sessionId;
  emit();
  return true;
}

/** Parse a "source:k" speaker id. Returns null for malformed ids. */
function parseSpeakerId(id: string): { source: Source; index: number } | null {
  const sep = id.indexOf(':');
  if (sep < 0) return null;
  const source = id.slice(0, sep);
  if (source !== 'mic' && source !== 'system') return null;
  const index = Number(id.slice(sep + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return { source, index };
}

/**
 * Default label for a speaker id given the capture mode.
 *
 * mic:0 is "You" only in "both" mode with call audio actually attached —
 * with no call source, the mic hears the whole room (everyone, not just the
 * user), so every mic speaker is numbered like a diarized one instead.
 */
export function defaultLabel(id: string, mode: CaptureMode, callAudioMissing = false): string {
  const parsed = parseSpeakerId(id);
  if (!parsed) return id;
  if (parsed.source === 'mic' && parsed.index === 0 && mode === 'both' && !callAudioMissing) return 'You';
  return `Speaker ${parsed.index + 1}`;
}

/**
 * Register a speaker the first time a segment names it.
 *
 * Label number and colour follow order of appearance across both sources,
 * not the id's per-source index: with diarization on both mic and call
 * audio, `mic:1` and `system:1` are two people, and `defaultLabel` would call
 * both "Speaker 2" in the same colour.
 */
export function ensureSpeaker(id: string, mode: CaptureMode): Speaker {
  const existing = state.speakers[id];
  if (existing) return existing;
  const parsed = parseSpeakerId(id);
  const known = Object.values(state.speakers);
  const callAudioMissing = state.callAudioMissing;
  const isYou = parsed?.source === 'mic' && parsed.index === 0 && mode === 'both' && !callAudioMissing;
  const others = known.filter((s) => !(s.id === 'mic:0' && mode === 'both' && !callAudioMissing)).length;
  const speaker: Speaker = {
    id,
    source: parsed ? parsed.source : 'mic',
    label: parsed && !isYou ? `Speaker ${others + 1}` : defaultLabel(id, mode, callAudioMissing),
    colorIndex: known.length % 8,
  };
  state = { ...state, speakers: { ...state.speakers, [id]: speaker } };
  emit();
  return speaker;
}

/** A final line with the user's word list applied; partials pass through (they are re-read anyway). */
function withVocabulary(seg: Segment): Segment {
  return seg.final ? applyVocabularyToSegment(seg, getPreparedVocabulary()) : seg;
}

/**
 * Apply the word list to every final line now in the store — after "Fix this
 * word" added a word, so the open transcript shows it at once (the autosave
 * that follows every change persists it).
 */
export function applyVocabularyToTranscript(): void {
  let changed = false;
  const segments = state.segments.map((s) => {
    const next = withVocabulary(s);
    if (next !== s) changed = true;
    return next;
  });
  if (!changed) return;
  state = { ...state, segments };
  emit();
}

/** Insert or replace a segment by id; registers its speaker. */
export function upsertSegment(seg: Segment): void {
  seg = withVocabulary(seg);
  // Already-placed segments (prefixed id) pass through, so re-upserts of a
  // stored segment (e.g. diarization relabelling) are not shifted twice.
  if (activeAppend && !seg.id.startsWith(activeAppend.prefix)) {
    seg = {
      ...seg,
      id: activeAppend.prefix + seg.id,
      start: seg.start + activeAppend.offset,
      end: seg.end + activeAppend.offset,
      words: shiftWords(seg.words, activeAppend.offset),
    };
  }
  ensureSpeaker(seg.speaker, state.mode);
  const idx = state.segments.findIndex((s) => s.id === seg.id);
  let segments: Segment[];
  if (idx >= 0) {
    if (state.segments[idx] === seg) return;
    segments = state.segments.slice();
    segments[idx] = seg;
  } else {
    segments = state.segments.concat(seg);
  }
  state = { ...state, segments };
  emit();
}

/** Resolve every still-unconfirmed line to its best-guess speaker: at Stop no
 *  more turns will confirm them, and a finished session shows no placeholder. */
export function confirmAllSegments(): void {
  if (!state.segments.some((s) => s.unconfirmed)) return;
  const segments = state.segments.map((s) => {
    if (!s.unconfirmed) return s;
    const rest = { ...s };
    delete rest.unconfirmed;
    return rest;
  });
  state = { ...state, segments };
  emit();
}

function shiftWords(words: Segment['words'], offset: number): Segment['words'] {
  return words?.map((w) => ({ ...w, start: w.start + offset, end: w.end + offset }));
}

/** Whether `id` is segment `root` or one of the parts it was split into
 *  (`speaker-attribution.ts` names those `${root}~${n}`). */
export function inSegmentFamily(id: string, root: string): boolean {
  return id === root || id.startsWith(`${root}~`);
}

/**
 * Replace segment `root` and every part it was split into with `parts`, in
 * store coordinates, where the first of them was. When none is stored yet,
 * the parts are upserted like new segments (shifted in append mode).
 */
export function replaceSegmentFamily(root: string, parts: Segment[]): void {
  if (parts.length === 0) return;
  let placed = parts.map(withVocabulary);
  if (activeAppend && !root.startsWith(activeAppend.prefix)) {
    const { prefix, offset } = activeAppend;
    root = prefix + root;
    placed = parts.map((part) => ({
      ...part,
      id: prefix + part.id,
      start: part.start + offset,
      end: part.end + offset,
      words: shiftWords(part.words, offset),
    }));
  }
  const family = state.segments.filter((s) => inSegmentFamily(s.id, root));
  if (family.length === placed.length && family.every((s, i) => s === placed[i])) return;
  for (const part of placed) ensureSpeaker(part.speaker, state.mode);
  const at = state.segments.findIndex((s) => inSegmentFamily(s.id, root));
  const rest = state.segments.filter((s) => !inSegmentFamily(s.id, root));
  const index = at < 0 ? rest.length : at;
  state = { ...state, segments: [...rest.slice(0, index), ...placed, ...rest.slice(index)] };
  emit();
}

export function renameSpeaker(id: string, label: string): void {
  const existing = state.speakers[id] ?? {
    id,
    source: 'mic' as Source,
    label: id,
    colorIndex: 0,
  };
  state = {
    ...state,
    speakers: { ...state.speakers, [id]: { ...existing, label } },
  };
  emit();
}

/**
 * Restore a crash-recovery snapshot (finals only) into the store.
 * Used by the "Resume last session" banner; replaces per-session transcript
 * data but leaves connection status/stats untouched. Never throws.
 */
export function restoreSnapshot(
  segments: Segment[],
  speakers: Record<string, Speaker>,
  startedAt: number | null = null
): void {
  try {
    const safeSegments = Array.isArray(segments)
      ? segments.filter((s) => s && typeof s.id === 'string' && s.final === true).map(restoredSegment)
      : [];
    const safeSpeakers =
      speakers && typeof speakers === 'object' ? { ...speakers } : {};
    state = {
      ...state,
      segments: safeSegments,
      speakers: safeSpeakers,
      startedAt: typeof startedAt === 'number' ? startedAt : state.startedAt,
    };
    emit();
  } catch {
    // Best-effort restore; live state must never break.
  }
}

// ---------------------------------------------------------------------------
// Levels bus: 0..1 RMS per source at rAF rate. Never touches React state.
// ---------------------------------------------------------------------------

const levelCache: Levels = { mic: 0, system: 0 };
const levelListeners = new Set<(l: Levels) => void>();
let levelRaf = 0;

function levelTick(): void {
  levelRaf = 0;
  if (levelListeners.size === 0) return;
  // Decay so meters fall smoothly between 100 ms worklet frames.
  levelCache.mic *= 0.92;
  levelCache.system *= 0.92;
  if (levelCache.mic < 0.001) levelCache.mic = 0;
  if (levelCache.system < 0.001) levelCache.system = 0;
  const snapshot: Levels = { mic: levelCache.mic, system: levelCache.system };
  for (const fn of levelListeners) fn(snapshot);
  levelRaf = requestAnimationFrame(levelTick);
}

/** Level range the meters span, in dBFS: quieter than this reads as silence. */
const METER_FLOOR_DB = -60;

/**
 * A frame's RMS as a 0..1 meter level on a dBFS scale. Speech RMS is roughly
 * 0.003–0.1 (−50 to −20 dBFS), which on a linear scale never left the
 * meters' idle floor.
 */
export function meterLevel(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(Math.min(1, rms));
  return Math.max(0, Math.min(1, 1 - db / METER_FLOOR_DB));
}

/** Latest worklet-reported RMS for a source, as a meter level. */
export function pushLevel(source: Source, rms: number): void {
  levelCache[source] = meterLevel(rms);
}

export function resetLevels(): void {
  levelCache.mic = 0;
  levelCache.system = 0;
}

export function subscribeLevels(cb: (l: Levels) => void): () => void {
  levelListeners.add(cb);
  if (levelRaf === 0 && typeof requestAnimationFrame !== 'undefined') {
    levelRaf = requestAnimationFrame(levelTick);
  }
  return () => {
    levelListeners.delete(cb);
    if (levelListeners.size === 0 && levelRaf !== 0) {
      cancelAnimationFrame(levelRaf);
      levelRaf = 0;
    }
  };
}
