export type Source = 'mic' | 'system';
export type CaptureMode = 'mic' | 'system' | 'both';
export type SystemVia = 'native' | 'browser';

export type Status =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'live'
  | 'paused'
  | 'stopping'
  | 'error';

/** One recognised word of a segment, on the segment's clock (seconds). */
export interface SegmentWord {
  text: string;
  start: number;
  end: number;
}

/**
 * A stretch where two or more speakers' diarization turns overlap, on the
 * segment's clock (seconds). `speakers` are everyone talking in it.
 */
export interface SegmentOverlap {
  start: number;
  end: number;
  speakers: string[];
}

export interface Segment {
  id: string;
  source: Source;
  /** Who said the words, even inside an overlap: each word has one speaker. */
  speaker: string;
  text: string;
  start: number;
  end: number;
  final: boolean;
  /** The words `text` joins, when the live path knows them: a speaker turn
   *  that arrives after the line is final can then split it between words
   *  (`speaker-attribution.ts`). Never persisted. */
  words?: SegmentWord[];
  /** Set while no diarization turn covers the line yet, so `speaker` is a
   *  guess and the UI shows a placeholder instead of a name. Cleared when a
   *  turn confirms it, and for every line at Stop (`confirmAllSegments`). */
  unconfirmed?: boolean;
  /** Set when the segment's words fall inside an overlap: the transcript
   *  shows the overlap's segments side by side, one column per speaker
   *  (`splitTranscript` in `export.ts`). A split never lets a segment
   *  straddle an overlap's edge. Absent in sessions saved before overlaps. */
  overlap?: SegmentOverlap;
}

export interface Speaker {
  id: string;
  source: Source;
  label: string;
  colorIndex: number; // 0-7
}

export interface Stats {
  rtf: number;
  lagMs: number;
  rssMb: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
  locked: boolean;
  confidence: number; // 0..1
}

/**
 * Where speaker detection stands for the current recording, written only by
 * `diarization-bridge.ts`:
 * - `off`: no recording, or it has not got as far as starting it yet;
 * - `waiting`: the model is still downloading, and starts when it lands;
 * - `loading`: the model is being loaded into its worker;
 * - `active`: turns are being produced;
 * - `unavailable`: this recording gets no speaker labels — `reason` says why.
 */
export type DiarizationPhase = 'off' | 'waiting' | 'loading' | 'active' | 'unavailable';

export interface DiarizationStatus {
  phase: DiarizationPhase;
  /** A sentence for the user; set for `waiting` and `unavailable`. */
  reason: string | null;
  /** Set once `active`: WebGPU turns lag ~2 s, the WASM fallback's ~4 s. */
  backend?: 'webgpu' | 'wasm';
}

export interface MeetingState {
  status: Status;
  mode: CaptureMode;
  startedAt: number | null;
  serverReady: boolean;
  segments: Segment[];
  speakers: Record<string, Speaker>;
  error: string | null;
  /** Non-blocking notice (e.g. system source lost while mic continues). */
  warning: string | null;
  /**
   * "Both"/"system" wanted call audio but it never attached (declined,
   * unsupported, no audio track). Read by `defaultLabel`/`ensureSpeaker`:
   * with no call source, `mic:0` hears the whole room, not just the user, so
   * it must not default to "You" — see `index.ts`'s `setCallAudioMissing`,
   * which is this field's only writer.
   */
  callAudioMissing: boolean;
  /** Detected/locked ASR language; null before the first server message. */
  language: LanguageInfo | null;
  stats: Stats | null;
  /** Speaker detection's state; absent reads as `off`. */
  diarization?: DiarizationStatus;
}

export interface Levels {
  mic: number;
  system: number;
}

export interface StartOpts {
  mode: CaptureMode;
  micDeviceId?: string;
  language?: string;
  systemVia?: SystemVia;
}

export const INITIAL_STATE: MeetingState = {
  status: 'idle',
  mode: 'mic',
  startedAt: null,
  serverReady: false,
  segments: [],
  speakers: {},
  error: null,
  warning: null,
  callAudioMissing: false,
  language: null,
  stats: null,
  diarization: { phase: 'off', reason: null },
};
