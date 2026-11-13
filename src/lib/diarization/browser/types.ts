/** Shared types for the in-browser streaming diarization module. */

import type { SerializedSpeakerState } from './speaker-state';

/** Same two capture sources the rest of the app uses (mic vs. system audio). */
export type Source = 'mic' | 'system';

/**
 * One finalized speaker turn, emitted once a contiguous span of speech from a
 * single (locally tracked) speaker closes. Mirrors the speaker/timing fields
 * of the realtime protocol's `Segment` (see `server/realtime/session.py`
 * and `src/lib/meeting/types.ts`) minus `text` — this module never produces
 * text, only who-spoke-when. The pipeline worker is expected to pair this
 * with ASR output the same way `session.py`'s Parakeet path pairs
 * `engine.diarize_chunk()` speaker labels with transcribed text.
 */
export interface SpeakerTurn {
  /** `${source}:${index}`, e.g. "mic:0" — same id shape `store.ts` parses.
   *  `index` is the model's speaker channel (0–7), in order of first arrival. */
  speaker: string;
  source: Source;
  /** Session-relative seconds. */
  start: number;
  end: number;
  /** Identifies the turn: a later report with the same id replaces this one.
   *  Absent on turns that are only ever reported once. */
  id?: string;
  /** False for a still-open turn, reported as it grows so the speaker is
   *  known before they stop talking; its `end` is not a speaker change.
   *  Absent means final. */
  final?: boolean;
  /** True on a turn split off a long run (`turns.ts` `maxOpenSec`): the same
   *  speaker's next turn starts at `end`, which is therefore no speaker
   *  change or pause. */
  continues?: boolean;
}

export interface DiarizerOptions {
  source: Source;
  /** A previous recording's speaker cache to start from, so its speakers
   *  keep their ids. Defaults to the source's seed (`speaker-state.ts`). */
  speakerState?: SerializedSpeakerState;
}

export interface DiarizerReady {
  /** Where the model runs: WebGPU, or the (slower, larger-chunk) WASM fallback. */
  backend: 'webgpu' | 'wasm';
}

/** Why a diarizer stopped. `not-cached`: the model files are not on disk, so
 *  a download (through the consent/progress UI) would fix it. */
export type DiarizerErrorCode = 'not-cached' | 'failed';

export interface Diarizer {
  /** Feed one chunk of 16 kHz mono PCM audio (values in [-1, 1]).
   *  `startSample` places the chunk on the caller's capture timeline; turns
   *  are then reported in seconds on that timeline. Without it, turns count
   *  from the first chunk the worker processed. */
  push(chunk: Float32Array, startSample?: number): void;
  /** Close any still-open turn and emit it. Resolves once the worker has, or
   *  after `timeoutMs`, whichever is first. */
  flush(timeoutMs?: number): Promise<void>;
  /** Subscribe to finalized speaker turns. Returns an unsubscribe function. */
  onSpeakerTurn(cb: (turn: SpeakerTurn) => void): () => void;
  /** Subscribe to worker-side failures (e.g. the model could not load). The
   *  diarizer produces no turns after one. Returns an unsubscribe function. */
  onError(cb: (message: string, code: DiarizerErrorCode) => void): () => void;
  /** Subscribe to the model having loaded: turns can follow from here. */
  onReady(cb: (info: DiarizerReady) => void): () => void;
  /** Flush any still-open turn and release the worker + model resources. */
  dispose(): void;
}
