/** Post-stop transcription — record the audio now, transcribe it when the
 *  recording stops.
 *
 * The CPU (WASM/int8) model measured at RTF 1.41 on the §3 Safari bench: it
 *  needs 1.41 seconds of compute per second of audio, so it can never keep up
 *  with a meeting being recorded — feeding it live frames produced a transcript
 *  that trailed the speakers by minutes and got worse the longer the meeting
 *  ran (and had the worst WER of the three variants, 0.623, besides). A model
 *  that cannot keep up with realtime must not be *offered* realtime: on a
 *  device with no usable WebGPU the recording is captured whole and
 *  transcribed after Stop, with a real percentage.
 *
 * The buffer is per source, because the app records the microphone and (in
 * "Both" mode) the shared tab/system stream as separate speakers — interleaving
 * them into one waveform would produce one speaker with two overlapping
 * voices, which is exactly what per-source live transcription avoided.
 *
 * Storage is 16-bit, the format `public/worklets/pcm16.js` already emits, so
 * the recorder holds what it was given instead of re-encoding it. Conversion to
 * the Float32 the model wants happens in `floatChunk()` at transcription time.
 *
 * `MAX_BUFFERED_SAMPLES_PER_SOURCE` bounds the memory. A Float32 buffer would
 * be 230 MB per hour of audio; Int16 halves that, and 2 h/source (≈230 MB) is
 * far past any meeting that gets transcribed on a device which needs a CPU
 * model in the first place. Hitting the cap is *stated*, never silent: the
 * oldest audio is dropped (the newest is what a meeting's outcome hangs on) and
 * `PostStopProgress.droppedSeconds` says how much, because a transcript that
 * quietly starts 20 minutes into the recording is worse than one that admits
 * the gap.
 */

import type { Source } from './types';

const SAMPLE_RATE = 16000;

/** 2 hours per source at 16 kHz, Int16 (≈230 MB). See the module header. */
export const MAX_BUFFERED_SAMPLES_PER_SOURCE = SAMPLE_RATE * 60 * 60 * 2;

/** Samples per transcription window. See `chunkedAudio` for why 60 s. */
export const CHUNK_SAMPLES = SAMPLE_RATE * 60;

/** What the caller has to supply to actually transcribe a chunk. */
export type ChunkTranscriber = (
  audio: Float32Array,
  source: Source,
  isFinal: boolean,
  /** Index of `audio[0]` in that source's recording, which starts at Record
   *  like the capture clock does. */
  startSample: number,
) => Promise<void>;

export type PostStopPhase = 'recording' | 'transcribing' | 'done' | 'error';

export interface PostStopProgress {
  phase: PostStopPhase;
  /** Chunks transcribed so far (only meaningful while `transcribing`/`done`). */
  chunksDone: number;
  /** Chunks in total, from the buffered audio's length. */
  chunksTotal: number;
  /** 0-100 over the *whole* post-stop job, or `null` before there is a
   *  denominator (nothing buffered yet). */
  percent: number | null;
  /** Which source is being transcribed, for the progress line. */
  source: Source | null;
  /** How much audio the buffer cap threw away, in seconds. */
  droppedSeconds: number;
  /** Why it failed, when `phase` is `error`. */
  error: string | null;
}

const NO_PROGRESS: PostStopProgress = Object.freeze({
  phase: 'recording',
  chunksDone: 0,
  chunksTotal: 0,
  percent: null,
  source: null,
  droppedSeconds: 0,
  error: null,
});

/** Frozen, shared, so the server snapshot of `useSyncExternalStore` is stable. */
export const NO_POST_STOP_PROGRESS = NO_PROGRESS;

/** Per-source audio, one entry per captured frame (no re-encoding on append). */
type SampleBuffer = Int16Array[];

let buffers = new Map<Source, SampleBuffer>();
/** Int16 samples dropped from the front of each source's buffer, by the cap. */
let droppedSamples = new Map<Source, number>();
/** Samples held in `buffers`, per source — kept alongside so each frame does
 *  not re-sum every chunk of the recording (36k of them per source an hour in). */
let bufferedSamples = new Map<Source, number>();
let progress: PostStopProgress = NO_PROGRESS;
let running = false;

const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

function setProgress(next: PostStopProgress): void {
  if (
    progress.phase === next.phase &&
    progress.chunksDone === next.chunksDone &&
    progress.chunksTotal === next.chunksTotal &&
    progress.percent === next.percent &&
    progress.source === next.source &&
    progress.droppedSeconds === next.droppedSeconds &&
    progress.error === next.error
  ) {
    return;
  }
  progress = next;
  notify();
}

/** Subscribe to post-stop transcription progress. Returns an unsubscribe. */
export function subscribePostStopTranscription(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The current post-stop progress. Stable between changes (safe to snapshot). */
export function getPostStopProgress(): PostStopProgress {
  return progress;
}

/** The server-render snapshot: one frozen constant, so hydration cannot mismatch. */
export function getServerPostStopProgress(): PostStopProgress {
  return NO_PROGRESS;
}

/** Whether a post-stop transcription is running right now. */
export function isPostStopTranscriptionRunning(): boolean {
  return running;
}

/** Seconds of audio currently buffered, per source. */
export function bufferedSeconds(): Partial<Record<Source, number>> {
  const out: Partial<Record<Source, number>> = {};
  for (const [source, chunks] of buffers) {
    let total = droppedSamples.get(source) ?? 0;
    for (const chunk of chunks) total += chunk.length;
    out[source] = total / SAMPLE_RATE;
  }
  return out;
}

/**
 * Start buffering for a new recording. Any audio left over from a previous
 * recording is dropped: it belongs to a transcript that was either written or
 * abandoned, and re-transcribing it would duplicate segments.
 */
export function beginPostStopCapture(): void {
  buffers = new Map();
  droppedSamples = new Map();
  bufferedSamples = new Map();
  running = false;
  setProgress({ ...NO_PROGRESS });
}

/** Throw away buffered audio without notifying (used by the full teardown). */
export function clearPostStopCapture(): void {
  buffers = new Map();
  droppedSamples = new Map();
  bufferedSamples = new Map();
  setProgress({ ...NO_PROGRESS });
}

/**
 * Append one captured frame.
 *
 * `pcm` is the `ArrayBuffer` the worklet posted: Int16LE mono @ 16 kHz, 1600
 * samples per frame. Frames that are not a whole number of samples, or not
 * Int16-sized, are ignored rather than reinterpreted — a mis-sized buffer here
 * would become a garbled transcript with nothing to indicate why.
 */
export function appendPostStopAudio(source: Source, pcm: ArrayBuffer): void {
  if (running) return; // Nothing is captured while the post-stop run happens.
  if (pcm.byteLength === 0 || pcm.byteLength % 2 !== 0) return;
  // The view owns the posted buffer, so the frame is kept without a copy.
  const samples = new Int16Array(pcm);
  const chunks = buffers.get(source) ?? [];
  let dropped = droppedSamples.get(source) ?? 0;
  let buffered = (bufferedSamples.get(source) ?? 0) + samples.length;
  chunks.push(samples);
  // Over the cap the *oldest* audio goes, trimmed from the front chunks.
  while (buffered > MAX_BUFFERED_SAMPLES_PER_SOURCE && chunks.length > 0) {
    const excess = buffered - MAX_BUFFERED_SAMPLES_PER_SOURCE;
    const front = chunks[0];
    if (front.length <= excess) {
      chunks.shift();
      buffered -= front.length;
      dropped += front.length;
    } else {
      chunks[0] = front.subarray(excess);
      buffered -= excess;
      dropped += excess;
    }
  }
  bufferedSamples.set(source, buffered);
  buffers.set(source, chunks);
  droppedSamples.set(source, dropped);
  if (dropped > 0) {
    setProgress({ ...progress, phase: 'recording', droppedSeconds: dropped / SAMPLE_RATE });
  }
}

/** Whether any audio is waiting to be transcribed. */
export function hasBufferedAudio(): boolean {
  for (const chunks of buffers.values()) {
    if (chunks.some((chunk) => chunk.length > 0)) return true;
  }
  return false;
}

/**
 * One source's audio, cut into transcription windows.
 *
 * Pure, and the reason this is a function: the window size is a real
 * constraint, not a loop parameter. Parakeet's encoder is a fixed-input-length
 * graph, so a multi-hour Float32 has to be cut anyway, and cutting it in a
 * pure function makes the boundary rule testable.
 *
 * Windows overlap by 0.5 s so a word cut at a boundary is still heard whole by
 * the next window's decoder, which receives the previous window's decoder
 * state (`BrowserASREngine` threads it through `previousDecoderState`). The
 * overlap is short enough that the re-decoded tail is a fraction of a word, and
 * every window is emitted as its own finalized segment — so the transcript is
 * a series of readable paragraphs rather than one paragraph that rewrites
 * itself for an hour.
 *
 * Returns `[]` for an empty buffer rather than a window of silence: an empty
 * `transcribe()` call costs a full encoder pass and produces nothing.
 */
export function chunkedAudio(samples: Int16Array, chunkSamples = CHUNK_SAMPLES): Float32Array[] {
  if (samples.length === 0) return [];
  // 0.5 s of context carried into the next window: long enough to contain the
  // decoder's own look-back for a split word, short enough that the duplicate
  // text it re-decodes is not repeated into the transcript (the engine emits
  // one segment per window and the store upserts by id, so a repeated tail
  // would otherwise appear twice).
  return [...chunkWindows(samples, chunkSamples)];
}

/**
 * `chunkedAudio`, one window at a time. The run converts each window just
 * before transcribing it: converting the whole recording up front held a
 * Float32 copy of all of it (≈ 920 MB for four hours) beside the Int16 one.
 */
export function* chunkWindows(samples: Int16Array, chunkSamples = CHUNK_SAMPLES): Generator<Float32Array> {
  const overlap = Math.floor(SAMPLE_RATE * 0.5);
  for (let start = 0; start < samples.length; start += chunkSamples) {
    const from = Math.max(0, start - overlap);
    const to = Math.min(samples.length, start + chunkSamples);
    yield floatChunk(samples.subarray(from, to));
  }
}

/**
 * `chunkWindows` over a list of frames, without first flattening them into one
 * contiguous copy. Yields the same windows (0.5 s overlap included). Each frame
 * is dropped from `chunks` (the array is emptied in place) once consumed, so
 * peak memory is the remaining frames plus one window.
 */
export function* chunkWindowsFromChunks(
  chunks: Int16Array[],
  chunkSamples = CHUNK_SAMPLES,
): Generator<{ window: Float32Array; startSample: number }> {
  const overlap = Math.floor(SAMPLE_RATE * 0.5);
  let remaining = 0;
  for (const chunk of chunks) remaining += chunk.length;
  let tail = new Int16Array(0); // last `overlap` samples of the previous window
  let index = 0; // next unread chunk
  let offset = 0; // read position inside chunks[index]
  let consumed = 0; // samples consumed so far == start of this window's body
  while (remaining > 0) {
    const bodyLength = Math.min(chunkSamples, remaining);
    const window = new Float32Array(tail.length + bodyLength);
    for (let i = 0; i < tail.length; i += 1) window[i] = tail[i] / 32768;
    let at = tail.length;
    let need = bodyLength;
    while (need > 0) {
      const chunk = chunks[index];
      const take = Math.min(need, chunk.length - offset);
      for (let i = 0; i < take; i += 1) window[at + i] = chunk[offset + i] / 32768;
      at += take;
      need -= take;
      offset += take;
      if (offset >= chunk.length) {
        chunks[index] = new Int16Array(0);
        index += 1;
        offset = 0;
      }
    }
    // Rebuild the overlap tail from the window just filled (as Int16-exact values).
    const keep = Math.min(overlap, window.length);
    const nextTail = new Int16Array(keep);
    for (let i = 0; i < keep; i += 1) {
      nextTail[i] = Math.round(window[window.length - keep + i] * 32768);
    }
    yield { window, startSample: consumed - tail.length };
    tail = nextTail;
    consumed += bodyLength;
    remaining -= bodyLength;
  }
  chunks.length = 0;
}

/** Int16 LE @ 16 kHz -> the Float32 in [-1, 1] the model is fed. */
export function floatChunk(samples: Int16Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = samples[i] / 32768;
  }
  return out;
}

/**
 * Transcribe everything buffered, reporting real progress.
 *
 * Sequential by necessity: `parakeet.js` keeps a single decoder state per model
 * and is not re-entrant, so overlapping windows would interleave their state
 * updates. `isFinal` is passed per window, which is what closes a segment
 * (`BrowserASREngine._buildSegments`) and gives each window its own id.
 *
 * Resolves `true` when every window transcribed — including the vacuous case of
 * an empty buffer, which is a Stop that had nothing to do. The buffer is
 * cleared either way: a second run over the same audio would duplicate every
 * segment.
 */
export async function transcribeRecordedAudio(
  transcribe: ChunkTranscriber,
): Promise<boolean> {
  if (running) return false;
  const sources = [...buffers.entries()];
  const sizes = new Map(
    sources.map(([source, chunks]) => [source, chunks.reduce((sum, c) => sum + c.length, 0)]),
  );
  // Samples the cap dropped from the front: window offsets are recording-relative.
  const offsets = new Map(droppedSamples);
  // The audio is released before the (potentially very long) transcription, so
  // the buffer's memory is not held for the whole run on top of the model's.
  buffers = new Map();
  droppedSamples = new Map();
  bufferedSamples = new Map();
  const droppedSeconds = progress.droppedSeconds;
  const work = sources
    .map(([source, chunks]) => ({ source, chunks, length: sizes.get(source) ?? 0 }))
    .filter((entry) => entry.length > 0);
  if (work.length === 0) {
    setProgress({ ...NO_PROGRESS, phase: 'done', droppedSeconds });
    return true;
  }

  const total = work.reduce(
    (sum, entry) => sum + Math.max(1, Math.ceil(entry.length / CHUNK_SAMPLES)),
    0,
  );
  running = true;
  setProgress({
    phase: 'transcribing',
    chunksDone: 0,
    chunksTotal: total,
    percent: 0,
    source: work[0].source,
    droppedSeconds,
    error: null,
  });

  let done = 0;
  let firstError: string | null = null;
  try {
    for (const { source, chunks } of work) {
      const base = offsets.get(source) ?? 0;
      for (const { window, startSample } of chunkWindowsFromChunks(chunks)) {
        setProgress({ ...progress, source, percent: Math.round((done / total) * 100) });
        // A failing window loses only itself: the rest of the recording still runs.
        try {
          await transcribe(window, source, true, base + startSample);
        } catch (err) {
          firstError ??= err instanceof Error ? err.message : String(err);
        }
        done += 1;
        setProgress({
          ...progress,
          source,
          chunksDone: done,
          percent: Math.round((done / total) * 100),
        });
      }
    }
    if (firstError !== null) {
      setProgress({ ...progress, phase: 'error', chunksDone: done, error: firstError, source: null });
      return false;
    }
    setProgress({
      ...progress,
      phase: 'done',
      chunksDone: done,
      chunksTotal: total,
      percent: 100,
      source: null,
    });
    return true;
  } finally {
    running = false;
  }
}

/** Test-only: drop all state without going through a recording lifecycle. */
export function resetPostStopTranscriptionForTests(): void {
  buffers = new Map();
  droppedSamples = new Map();
  bufferedSamples = new Map();
  running = false;
  progress = NO_PROGRESS;
}
