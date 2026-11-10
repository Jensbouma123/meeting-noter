/**
 * Bridges `src/lib/diarization/browser` (speaker turns) into the meeting
 * pipeline's speaker-label hook (`browser-asr.ts`'s `setSpeakerLabeler`) —
 * see that hook's own doc comment for why it existed as a seam in the first
 * place, and `src/lib/diarization/browser/README.md` for the module this
 * wires in.
 *
 * Owns: registering the diarization model in the same download/consent
 * registry ASR uses (one dialog, one queue), creating one diarizer per
 * active capture source once consent+cache actually allow it, feeding it
 * audio stamped with the capture clock, and pairing its output with ASR
 * segments by time.
 *
 * Turns arrive asynchronously, one diarizer step (2–4 s of audio) behind: a
 * still-open turn is reported as it grows, then once more when it closes,
 * each report replacing the last under the turn's id. A segment transcribed
 * before its turn arrives gets the most recently active speaker as a
 * provisional label, and is relabelled when a turn covering it arrives (most
 * turn time within the segment's span wins).
 *
 * Turns of different speakers can overlap. A word still gets one speaker,
 * but the stretches where two or more talk at once (`overlapsIn`) are handed
 * to `speaker-attribution.ts`, which marks the words in them so the
 * transcript can show those speakers side by side.
 *
 * `MeetingState.diarization` tells the UI where this stands (waiting for the
 * download, loading, active, or unavailable and why).
 *
 * Diarization is optional and non-blocking by design: recording starts and
 * transcribes immediately regardless of whether this model is
 * downloaded/ready yet. Until a source's first turn closes, that source's
 * segments keep the default single-speaker-per-source id (`${source}:0`)
 * exactly as if this bridge weren't wired in at all — "label turns once
 * ready," not "wait for ready."
 */

import {
  registerModel,
  isConsentGiven,
  getModelStatus,
  markNotCached,
  registerDownloadHandler,
  retryDownload,
  subscribeRegistry,
  type AsrBackend,
} from '@/lib/asr/browser';
import { debugEnabled } from '@/lib/asr/browser/quiet-console';
import { createDiarizer, type Diarizer, type SpeakerTurn } from '@/lib/diarization/browser';
import { ensureDiarizationModelsCached } from '@/lib/diarization/browser/downloader';
import {
  DIARIZATION_MODEL_REPO,
  DIARIZATION_MODELS,
  DIARIZATION_TOTAL_SIZE_BYTES,
} from '@/lib/diarization/browser/manifest';
import type { DiarizationStatus, Segment, SegmentOverlap, Source } from './types';
import { setSpeakerLabeler, setSpeakerTimeline, type SpeakerTimeline } from './browser-asr';
import { captureSpanOf, getState, inSegmentFamily, replaceSegmentFamily, setState } from './store';
import { attributeSpeakers, mergeFamily, segmentFamilyRoot, setOverlapTimeline } from './speaker-attribution';
import { isOverlapPassSegment, noteOverlapTurns } from './overlap-retranscribe';
import { int16ToFloat32 } from './pcm';

/** Registry key — shared consent/download UI, same shape as the ASR entry. */
export const DIARIZATION_REGISTRY_KEY = 'diarization-turns';

/** The registry entry's `modelRepo`: the repo and every file it fetches. */
export const DIARIZATION_REGISTRY_IDENTITY = `${DIARIZATION_MODEL_REPO}:${DIARIZATION_MODELS.map((f) => f.filename).join('+')}`;

let downloadHandlerRegistered = false;

/**
 * Register the diarization model in the shared download/consent registry
 * and, the first time only, how to actually download it. Safe to call
 * repeatedly — mirrors `registerDefaultModels`'s own
 * idempotent-after-the-first-real-change contract (`registerModel` no-ops
 * once an identical entry already exists).
 */
export function registerDiarizationModel(backend: AsrBackend): void {
  if (!downloadHandlerRegistered) {
    // Injected rather than imported into browser-asr-download-manager.ts
    // directly: that module is `src/lib/asr/browser/**`, owned independently
    // of this diarization module (see its README) — sharing one download
    // queue/consent dialog shouldn't mean sharing code coupling too.
    registerDownloadHandler('diarization', async (onProgress) => {
      // The worker (worker.ts's loadModel()) reads these files from the
      // same IndexedDB cache (cache-only, never downloading) and builds the
      // ONNX sessions itself — this call only gets bytes into cache under the
      // shared consent/progress UI, so it keeps none of them resident.
      await ensureDiarizationModelsCached((_file, p) => onProgress(p));
    });
    downloadHandlerRegistered = true;
  }

  registerModel({
    key: DIARIZATION_REGISTRY_KEY,
    // Identity for registerModel's drift detection, never shown to the user:
    // it must change whenever the files do. It still named the pyannote +
    // WeSpeaker repos after the switch to Nemotron, so a browser that had
    // cached those kept a "cached" entry for files it never had — the worker
    // refused to load, and no recording got a speaker turn.
    modelRepo: DIARIZATION_REGISTRY_IDENTITY,
    displayName: 'Speaker detection',
    estimatedSizeBytes: DIARIZATION_TOTAL_SIZE_BYTES,
    description:
      'Identifies who is speaking, run entirely on your device. Optional — transcripts work ' +
      'without it, just without speaker labels. Downloaded once and cached in your browser.',
    preCheckCache: true,
    // Diarization runs its own WebGPU→WASM fallback per source (see
    // onnx-session.ts) — this field only identifies which backend variant of
    // the *ASR* model this device is using, for the registry's shared
    // dedup/self-healing logic (see model-registry.ts); it doesn't change
    // which diarization files get fetched (there's only one set).
    backend,
    kind: 'diarization',
  });
}

/* ------------------------------------------------------------------ */
/* Per-session diarizer instances                                      */
/* ------------------------------------------------------------------ */

const activeDiarizers = new Map<Source, Diarizer>();
/** Most recently closed speaker id per source — the provisional label. */
const currentSpeaker = new Map<Source, string>();
/** This session's turns per source, on the capture timeline, by start time.
 *  Kept past `stopDiarization()`: a CPU-only device transcribes after Stop
 *  and still needs them. Cleared by `resetDiarization()`. */
const turns = new Map<Source, SpeakerTurn[]>();

/** How many of the newest segments a turn may relabel. A turn is at most a
 *  few seconds behind the transcript, so this is generous. */
const RELABEL_LOOKBACK_SEGMENTS = 200;

function labelFor(source: 'mic' | 'system'): string {
  return currentSpeaker.get(source) ?? `${source}:0`;
}

function turnsOf(source: Source): SpeakerTurn[] {
  return turns.get(source) ?? [];
}

/** Longest turn seen per source: turns are sorted by `start` only, so this
 *  bounds how far before a span a still-overlapping turn can begin. */
const maxTurnLength = new Map<Source, number>();

/** Index of the first of `source`'s turns that can still overlap `start`.
 *  A binary search, instead of scanning every turn from the start of the
 *  meeting for each segment. */
function firstTurnReaching(source: Source, start: number): number {
  const list = turnsOf(source);
  const earliest = start - (maxTurnLength.get(source) ?? 0);
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].start < earliest) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Turn times closer than this are a tie. */
const TIE_SECONDS = 1e-6;

/**
 * The speaker with the most turn time in `[start, end]`. Inside an overlap
 * two turns often cover a word completely; the tie goes to the speaker the
 * span lies deepest inside (farthest from that turn's nearer edge), so in a
 * hand-over the words before its middle stay the outgoing speaker's and the
 * rest are the incoming one's, and a back-channel inside a longer turn does
 * not take that turn's words.
 *
 * Giving the tie instead to the turn that began most recently (0.2 s or more
 * before the word) put more words under the wrong speaker on the AMI replay
 * (`scripts/live-diarization-replay.test.ts`): 25.2 % of Parakeet's words
 * against 18.6 %, 38.2 % of the reference words against 36.1 %. One source's
 * words are one speech stream, which mostly follows the louder voice: inside
 * a second speaker's turn it is still the first speaker's words it hears.
 *
 * Nor did the model's own frame-level evidence help. Giving a word two
 * speakers' turns cover to the one with the highest mean Sortformer
 * probability over the word (the diarizer reporting each step's
 * probabilities per 80 ms frame) put 22.8 % of Parakeet's words under the
 * wrong speaker and 36.9 % of the reference words; doing so only on a tie,
 * or only inside a `MIN_OVERLAP_SECONDS` overlap, 22.3 % and 35.9 %.
 */
function speakerFor(source: Source, start: number, end: number): string | null {
  const time = new Map<string, number>();
  const depth = new Map<string, number>();
  const list = turnsOf(source);
  for (let i = firstTurnReaching(source, start); i < list.length; i += 1) {
    const turn = list[i];
    if (turn.start >= end) break;
    const overlap = Math.min(end, turn.end) - Math.max(start, turn.start);
    if (overlap <= 0) continue;
    time.set(turn.speaker, (time.get(turn.speaker) ?? 0) + overlap);
    const inside = Math.min(start - turn.start, turn.end - end);
    depth.set(turn.speaker, Math.max(depth.get(turn.speaker) ?? -Infinity, inside));
  }
  let best: string | null = null;
  let bestTime = 0;
  for (const [speaker, t] of time) {
    const tie = best !== null && Math.abs(t - bestTime) <= TIE_SECONDS;
    if (tie ? depth.get(speaker)! > depth.get(best!)! : t > bestTime) {
      best = speaker;
      bestTime = Math.max(t, bestTime);
    }
  }
  return best;
}

/** Shortest stretch of two or more speakers at once that counts as overlap:
 *  shorter ones are mostly one turn's edge running into the next. */
export const MIN_OVERLAP_SECONDS = 0.4;

/**
 * Where two or more of `source`'s speakers' turns overlap for at least
 * `MIN_OVERLAP_SECONDS`, for each such stretch that intersects
 * `[start, end]`: its whole extent, and everyone talking in it.
 */
function overlapsIn(source: Source, start: number, end: number): SegmentOverlap[] {
  const list = turnsOf(source);
  const reach = maxTurnLength.get(source) ?? 0;
  const events: { at: number; speaker: string; delta: 1 | -1 }[] = [];
  for (let i = firstTurnReaching(source, start - reach); i < list.length; i += 1) {
    const turn = list[i];
    if (turn.start >= end + reach) break;
    if (turn.end <= start - reach || turn.end <= turn.start) continue;
    events.push({ at: turn.start, speaker: turn.speaker, delta: 1 });
    events.push({ at: turn.end, speaker: turn.speaker, delta: -1 });
  }
  // A turn ending where the next begins does not overlap it.
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);

  const found: SegmentOverlap[] = [];
  const active = new Map<string, number>();
  let open: { start: number; speakers: Set<string> } | null = null;
  for (const { at, speaker, delta } of events) {
    const count = (active.get(speaker) ?? 0) + delta;
    if (count > 0) active.set(speaker, count);
    else active.delete(speaker);
    if (active.size >= 2) {
      open ??= { start: at, speakers: new Set() };
      for (const who of active.keys()) open.speakers.add(who);
    } else if (open) {
      if (at - open.start >= MIN_OVERLAP_SECONDS && at > start && open.start < end) {
        found.push({ start: open.start, end: at, speakers: [...open.speakers] });
      }
      open = null;
    }
  }
  return found;
}

function changePoints(source: Source, start: number, end: number): number[] {
  const points: number[] = [];
  const list = turnsOf(source);
  for (let i = 1; i < list.length; i += 1) {
    const prev = list[i - 1];
    const next = list[i];
    if (prev.speaker === next.speaker) continue;
    // In the silence between the two turns when there is one, so the cut
    // does not land on a word.
    const at = prev.end <= next.start ? (prev.end + next.start) / 2 : next.start;
    if (at > start && at < end) points.push(at);
  }
  return points;
}

/** Where turns closed. A still-open turn's end is only where the diarizer's
 *  last step stopped, not where anyone stopped talking. */
function turnEnds(source: Source, start: number, end: number): number[] {
  return turnsOf(source)
    .filter((turn) => turn.final !== false)
    .map((turn) => turn.end)
    .filter((t) => t > start && t < end);
}

function insertTurn(turn: SpeakerTurn): void {
  const list = turns.get(turn.source) ?? [];
  // A report of a turn already held replaces it. Updates are for open
  // turns, which are among the newest, so search from the end.
  if (turn.id !== undefined) {
    for (let j = list.length - 1; j >= 0; j -= 1) {
      if (list[j].id === turn.id) {
        list.splice(j, 1);
        break;
      }
    }
  }
  let i = list.length;
  while (i > 0 && list[i - 1].start > turn.start) i -= 1;
  list.splice(i, 0, turn);
  maxTurnLength.set(
    turn.source,
    Math.max(maxTurnLength.get(turn.source) ?? 0, turn.end - turn.start),
  );
  turns.set(turn.source, list);
}

/** `speakerFor`, or when no turn overlaps the span the speaker of the
 *  nearest turn: speech the diarizer called silence, or said before its first
 *  turn, is still someone's. */
function speakerNear(source: Source, start: number, end: number): string | null {
  const found = speakerFor(source, start, end);
  if (found) return found;
  let best: string | null = null;
  let bestGap = Infinity;
  for (const turn of turnsOf(source)) {
    const gap = turn.start >= end ? turn.start - end : start - turn.end;
    if (gap < bestGap) {
      best = turn.speaker;
      bestGap = gap;
    }
  }
  return best;
}

const timeline: SpeakerTimeline = { speakerFor, speakerNear, changePoints, turnEnds };

function overlapKey(seg: Segment): string {
  const o = seg.overlap;
  return o ? `${o.start}-${o.end}-${o.speakers.join()}` : '';
}

function sameParts(a: readonly Segment[], b: readonly Segment[]): boolean {
  return a.length === b.length && a.every((s, i) => s.id === b[i].id && s.speaker === b[i].speaker && !!s.unconfirmed === !!b[i].unconfirmed && s.text === b[i].text && overlapKey(s) === overlapKey(b[i]));
}

/**
 * Re-attribute, word by word, every recent segment from where the previous
 * turn ended up to where this one does: the words this turn covers, and any
 * in the gap before it (all of them, for a source's first turn), and every
 * one still pending. A segment,
 * open or final, whose words turn out to be two speakers' is split between them
 * (`speaker-attribution.ts`); the store updates in place. Matched on the
 * capture clock: an appended recording's segments are stored shifted past the
 * earlier transcript, whose own segments are left alone.
 */
function relabelSegments(turn: SpeakerTurn): void {
  const list = turnsOf(turn.source);
  let from = -Infinity;
  for (const other of list) if (other !== turn && other.start <= turn.start) from = Math.max(from, other.end);
  from = Math.min(from, turn.start);
  const segments = getState().segments;
  const roots = new Set<string>();
  for (let i = segments.length - 1; i >= Math.max(0, segments.length - RELABEL_LOOKBACK_SEGMENTS); i -= 1) {
    const seg = segments[i];
    // The overlap pass's words are the quieter voice's, which the turns
    // would hand back to the louder one.
    if (seg.source !== turn.source || isOverlapPassSegment(seg.id)) continue;
    // A line still pending is read again too, wherever it is: one no turn
    // covers (before the source's first turn, say) is confirmed only once
    // the diarizer is far enough past it, by a later turn than its own.
    const span = captureSpanOf(seg);
    if (span && ((span.end > from && span.start < turn.end) || seg.unconfirmed)) roots.add(segmentFamilyRoot(seg.id));
  }
  for (const root of roots) {
    const family = getState().segments.filter((s) => inSegmentFamily(s.id, root));
    const merged = mergeFamily(family);
    const span = captureSpanOf(merged);
    if (!span) continue;
    const offset = merged.start - span.start;
    const parts = attributeSpeakers(
      merged,
      (a, b) => speakerNear(turn.source, a - offset, b - offset),
      (a, b) => speakerFor(turn.source, a - offset, b - offset),
      (a, b) =>
        overlapsIn(turn.source, a - offset, b - offset).map((o) => ({
          ...o,
          start: o.start + offset,
          end: o.end + offset,
        })),
    );
    if (!sameParts(parts, family)) replaceSegmentFamily(root, parts);
  }
}

/** End of the most recently active speech reported per source: the speaker
 *  there is the provisional label for what is transcribed next. */
const latestTurnEnd = new Map<Source, number>();
/** Capture-clock seconds of audio handed to each source's diarizer. */
const heardUntil = new Map<Source, number>();

function onTurn(turn: SpeakerTurn): void {
  insertTurn(turn);
  if (turn.end >= (latestTurnEnd.get(turn.source) ?? -Infinity)) {
    latestTurnEnd.set(turn.source, turn.end);
    currentSpeaker.set(turn.source, turn.speaker);
  }
  if (debugEnabled()) {
    const lag = (heardUntil.get(turn.source) ?? turn.end) - turn.end;
    console.debug(
      `[diarization] turn ${turn.speaker} ${turn.start.toFixed(2)}–${turn.end.toFixed(2)} s` +
        `${turn.final === false ? ' (open)' : ''}, reported ${lag.toFixed(2)} s of audio after its end`,
    );
  }
  relabelSegments(turn);
  noteOverlapTurns(turn.source, turnsOf(turn.source));
}

function setDiarizationStatus(status: DiarizationStatus): void {
  setState({ diarization: status });
}

/** Sources waiting for the model's download to finish before starting. */
const waitingSources = new Set<Source>();
let stopWaiting: (() => void) | null = null;
/** A "not downloaded" worker error re-downloads once per recording; a
 *  second one means the download does not stick, and is reported. */
let redownloadedThisSession = false;

function clearWaiting(): void {
  waitingSources.clear();
  stopWaiting?.();
  stopWaiting = null;
}

/** Start `sources` once the registry has the model on disk. */
function waitForDownload(sources: readonly Source[]): void {
  for (const source of sources) waitingSources.add(source);
  setDiarizationStatus({ phase: 'waiting', reason: 'Speaker detection starts when its model has downloaded.' });
  if (stopWaiting) return;
  stopWaiting = subscribeRegistry(() => {
    const entry = getModelStatus(DIARIZATION_REGISTRY_KEY);
    if (entry?.status === 'cached') {
      const ready = [...waitingSources];
      clearWaiting();
      createDiarizers(ready);
    } else if (entry && entry.status !== 'downloading' && entry.status !== 'not-downloaded') {
      clearWaiting();
      setDiarizationStatus({ phase: 'unavailable', reason: unavailableReason(entry.status, entry.error) });
    }
  });
}

function unavailableReason(status: string, error: string | null): string {
  if (status === 'cancelled') return 'The speaker detection download was cancelled — download it in Settings to label speakers.';
  if (status === 'failed') return `The speaker detection download failed${error ? `: ${error}` : ''}.`;
  return 'Speaker detection is not available in this browser.';
}

function createDiarizers(sources: readonly Source[]): void {
  for (const source of sources) {
    if (activeDiarizers.has(source)) continue;
    const diarizer = createDiarizer({ source });
    diarizer.onSpeakerTurn(onTurn);
    diarizer.onReady(({ backend }) => {
      if (activeDiarizers.get(source) !== diarizer) return;
      setDiarizationStatus({ phase: 'active', reason: null, backend });
    });
    // A failed model load (or any worker error) leaves a diarizer that
    // labels nothing: drop it and say so, rather than staying "active".
    diarizer.onError((message, code) => {
      if (activeDiarizers.get(source) !== diarizer) return;
      stopDiarizationForSource(source);
      // The registry said "cached" but the files are gone (evicted, cleared,
      // or never fetched under a stale entry): make it say so, and — consent
      // being on file — fetch them through the registry, as a page load would.
      if (code === 'not-cached' && (!redownloadedThisSession || stopWaiting)) {
        const first = !redownloadedThisSession;
        redownloadedThisSession = true;
        if (first) markNotCached(DIARIZATION_REGISTRY_KEY, message);
        waitForDownload([source]);
        if (first) void retryDownload(DIARIZATION_REGISTRY_KEY).catch(() => {});
        return;
      }
      setState({ warning: `Speaker detection unavailable: ${message}` });
      if (activeDiarizers.size === 0) setDiarizationStatus({ phase: 'unavailable', reason: message });
    });
    activeDiarizers.set(source, diarizer);
  }
  if (activeDiarizers.size > 0) {
    setSpeakerLabeler(labelFor);
    setSpeakerTimeline(timeline);
    setOverlapTimeline(overlapsIn);
    if (getState().diarization?.phase !== 'active') setDiarizationStatus({ phase: 'loading', reason: null });
  }
}

/**
 * Start diarizing every given (already-attached) source, if the user has
 * consented to the model. Never prompts for consent: without it the status
 * says why there are no speakers, and recording proceeds with the default
 * labeling. A consented model that is still downloading starts when it lands.
 */
export function startDiarization(sources: readonly Source[]): void {
  const entry = getModelStatus(DIARIZATION_REGISTRY_KEY);
  if (!entry || !isConsentGiven(DIARIZATION_REGISTRY_KEY)) {
    setDiarizationStatus({
      phase: 'unavailable',
      reason: 'Speaker detection is not downloaded — download it in Settings to label speakers.',
    });
    return;
  }
  if (entry.status === 'downloading' || entry.status === 'not-downloaded') {
    // A consented download resumes on its own at page load
    // (`autoResumeConsentedDownloads`); this one just has not finished.
    waitForDownload(sources);
    if (entry.status === 'not-downloaded') void retryDownload(DIARIZATION_REGISTRY_KEY).catch(() => {});
    return;
  }
  if (entry.status !== 'cached') {
    setDiarizationStatus({ phase: 'unavailable', reason: unavailableReason(entry.status, entry.error) });
    return;
  }
  createDiarizers(sources);
}

/**
 * Feed one captured audio frame to that source's diarizer, if one is running.
 * `startSample` is the frame's position on the capture clock, which ASR
 * segments are stamped with too; it is what lets turns and segments be
 * matched.
 */
export function pushDiarizationAudio(source: Source, pcm: ArrayBuffer, startSample?: number): void {
  const diarizer = activeDiarizers.get(source);
  if (!diarizer || pcm.byteLength < 2) return;
  if (startSample !== undefined) heardUntil.set(source, (startSample + (pcm.byteLength >> 1)) / 16_000);
  // The frame is Int16 PCM; the models need [-1, 1] floats. The conversion
  // is also the copy `Diarizer.push()` needs: it transfers the buffer to its
  // worker, and `pcm` is still read by ASR in the same frame handler.
  diarizer.push(int16ToFloat32(pcm), startSample);
}

/** What each source has given its diarizer this recording, for the capture
 *  diagnostics readout. */
export interface DiarizationFeed {
  running: boolean;
  waiting: boolean;
  /** Capture-clock seconds of audio handed to the diarizer. */
  heardSeconds: number;
  turns: number;
}

export function getDiarizationFeed(): Partial<Record<Source, DiarizationFeed>> {
  const out: Partial<Record<Source, DiarizationFeed>> = {};
  for (const source of ['mic', 'system'] as const) {
    const running = activeDiarizers.has(source);
    const waiting = waitingSources.has(source);
    const turnCount = turnsOf(source).length;
    if (!running && !waiting && turnCount === 0) continue;
    out[source] = { running, waiting, heardSeconds: heardUntil.get(source) ?? 0, turns: turnCount };
  }
  return out;
}

/** Emit every still-open turn, e.g. on Stop, so the last speaker of the
 *  meeting is labelled too. Bounded by the diarizer's own flush timeout. */
export async function flushDiarization(): Promise<void> {
  await Promise.all([...activeDiarizers.values()].map((d) => d.flush()));
}

/** Dispose one source's diarizer, e.g. when that source's capture track ends
 *  while the rest of the session keeps going (see `handleSourceEnded` in
 *  `index.ts`). Leaves the other source's diarizer (and the shared labeler)
 *  running, and keeps the turns it already produced. */
export function stopDiarizationForSource(source: Source): void {
  waitingSources.delete(source);
  if (waitingSources.size === 0) clearWaiting();
  const diarizer = activeDiarizers.get(source);
  if (!diarizer) return;
  diarizer.dispose();
  activeDiarizers.delete(source);
  if (activeDiarizers.size === 0 && !stopWaiting) setDiarizationStatus({ phase: 'off', reason: null });
}

/** Dispose every active diarizer. The turns stay, and so does the labelling
 *  that uses them, until `resetDiarization()`: a post-stop transcription runs
 *  after this and labels its segments from them. */
export function stopDiarization(): void {
  clearWaiting();
  for (const diarizer of activeDiarizers.values()) {
    diarizer.dispose();
  }
  activeDiarizers.clear();
  if (getState().diarization?.phase !== 'off') setDiarizationStatus({ phase: 'off', reason: null });
}

/** Forget the previous session's turns and restore the default labelling. */
export function resetDiarization(): void {
  stopDiarization();
  turns.clear();
  maxTurnLength.clear();
  currentSpeaker.clear();
  latestTurnEnd.clear();
  heardUntil.clear();
  redownloadedThisSession = false;
  setSpeakerLabeler(null);
  setSpeakerTimeline(null);
  setOverlapTimeline(null);
}
