import { useSyncExternalStore } from 'react';
import { Capture, type CaptureDiagnostics } from './capture';
import {
  getState,
  pushLevel,
  resetLevels,
  resetSession,
  setState,
  subscribe,
  subscribeLevels as storeSubscribeLevels,
  renameSpeaker as storeRenameSpeaker,
  applyVocabularyToTranscript,
  confirmAllSegments,
  getTranscriptSessionId,
  isAppendActive,
} from './store';
import { loadSpeakerState, saveSpeakerState } from './persist';
import { addFixedWord } from '@/lib/vocabulary/store';
import { seedSpeakerStates, takeReportedSpeakerStates } from '@/lib/diarization/browser/speaker-state';
import {
  INITIAL_STATE,
  type Levels,
  type MeetingState,
  type Source,
  type StartOpts,
} from './types';
import {
  getBrowserASREnabled,
  pushLiveAudio,
  flushLiveAudio,
  resetBrowserASR,
  ensureBrowserASRReady,
  enableBrowserASR,
  disableBrowserASR,
  resolveAsrBackend,
  isPostStopTranscriptionOnly,
  isPostStopTranscriptionRunning,
  beginRecordedAudioCapture,
  bufferRecordedAudio,
  transcribeRecordedAudioAfterStop,
  getLiveAsrFeed,
  type LiveAsrFeed,
} from './browser-asr';
import {
  flushDiarization,
  getDiarizationFeed,
  type DiarizationFeed,
  pushDiarizationAudio,
  resetDiarization,
  startDiarization,
  stopDiarization,
  stopDiarizationForSource,
} from './diarization-bridge';
import {
  flushOverlapRetranscribe,
  pushOverlapAudio,
  resetOverlapRetranscribe,
} from './overlap-retranscribe';
import {
  startLangId,
  pushLangIdAudio,
  stopLangId,
  stopLangIdForSource,
  setLanguageOverride,
  resetLanguageOverride,
} from './langid-bridge';

export type { CaptureMode, LanguageInfo, Levels, MeetingState, Source, Status, Segment, Speaker, StartOpts, SystemVia } from './types';
export { useSpeakerStats, computeSpeakerStats, type SpeakerStat } from './store';
export {
  enableBrowserASR,
  disableBrowserASR,
  resetBrowserASR,
  getBrowserASREnabled,
  getBrowserASRReady,
  getBrowserASRLoading,
  getBrowserASRFailed,
  getBrowserASRError,
  getBrowserASRPhase,
  getBrowserASRStatusMessage,
  getBrowserASRProgress,
  getServerBrowserASRProgress,
  ensureBrowserASRReady,
  promptBrowserASRDownload,
  didPreviousModelLoadCrash,
  retryCrashedLoadWithSmallerModel,
  subscribeBrowserASR,
  warmBrowserASR,
  setSpeakerLabeler,
  resolveAsrBackend,
  isPostStopTranscriptionOnly,
  isPostStopTranscriptionRunning,
  transcribeRecordedAudioAfterStop,
  getPostStopTranscriptionProgress,
  POST_STOP_MESSAGE,
  type BrowserASRProgress,
  type SpeakerLabeler,
} from './browser-asr';
export {
  getServerPostStopProgress,
  subscribePostStopTranscription,
  type PostStopProgress,
  type PostStopPhase,
} from './post-stop-transcription';

// Module-level session singletons: one live session at a time.
let capture: Capture | null = null;
let paused = false;
let sessionOver = true;

/** The stop in flight, so a second `stop()` (Stop then R, Stop then leaving
 *  the view) joins it instead of re-running the teardown under it. */
let stopPromise: Promise<void> | null = null;

/**
 * Whether this session transcribes after Stop (`true`) or live (`false`),
 * decided once per session; `null` until the backend probe has answered.
 * Frames and Stop both read this one answer — a per-frame re-read routed the
 * frames captured before the probe answered to a buffer a WebGPU device never
 * transcribes, and a mid-session fall to WASM made Stop skip the live flush.
 */
let sessionPostStop: boolean | null = null;
/** Frames captured before `sessionPostStop` was decided, replayed once it is. */
let undecidedFrames: { source: Source; pcm: ArrayBuffer; at: number }[] = [];
/** Settles when this session's `resolveAsrBackend()` has. */
let backendResolved: Promise<void> = Promise.resolve();
/** How long a decision waits on a probe that never answers before giving up. */
const BACKEND_DECISION_TIMEOUT_MS = 5000;

function routeAsrFrame(source: Source, pcm: ArrayBuffer, at: number): void {
  if (sessionPostStop === null) {
    undecidedFrames.push({ source, pcm, at });
  } else if (sessionPostStop) {
    bufferRecordedAudio(source, pcm);
  } else {
    pushLiveAudio(source, pcm, at);
  }
}

/** Wait (bounded) for the backend probe, then fix this session's answer and
 *  replay the frames held while it was pending. */
async function decideTranscriptionMode(): Promise<boolean> {
  if (sessionPostStop === null) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      backendResolved,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, BACKEND_DECISION_TIMEOUT_MS);
      }),
    ]);
    clearTimeout(timer);
  }
  if (sessionPostStop === null) {
    sessionPostStop = isPostStopTranscriptionOnly();
    const held = undecidedFrames;
    undecidedFrames = [];
    for (const f of held) routeAsrFrame(f.source, f.pcm, f.at);
  }
  return sessionPostStop;
}

/**
 * Whether "Call" audio was wanted (mode `both`/`system`) but isn't actually
 * being captured — the user declined the share picker, the browser can't
 * share audio at all (Safari), the shared surface had no audio track, or its
 * track stayed silent (`FrameHandler.onCallAudioSilent`). Deliberately not part of a blocking `warning`/`error` (see
 * `Capture.start()`'s doc comment): this is a small, standalone observable
 * store — the same pattern `browser-asr.ts` uses for its own state — so
 * `BottomDock`'s "call audio not included" indicator can subscribe to it
 * directly without MeetingView needing to thread a new prop through.
 */
let callAudioMissing = false;
const callAudioListeners = new Set<() => void>();

function setCallAudioMissing(value: boolean): void {
  if (callAudioMissing === value) return;
  callAudioMissing = value;
  // Mirrored into the main store too: `ensureSpeaker`/`defaultLabel` read it
  // from there, so a degraded "both" session numbers mic speakers instead of
  // calling one of them "You" (see `MeetingState.callAudioMissing`).
  setState({ callAudioMissing: value });
  for (const fn of callAudioListeners) fn();
}

/** Whether call audio is currently missing from an active recording (see `callAudioMissing` above). */
export function getCallAudioMissing(): boolean {
  return callAudioMissing;
}

/** Subscribe to `getCallAudioMissing()` changes. Returns an unsubscribe function. */
export function subscribeCallAudio(fn: () => void): () => void {
  callAudioListeners.add(fn);
  return () => {
    callAudioListeners.delete(fn);
  };
}

/** The session this recording's speakers belong to, and whether it continues
 *  that session's transcript. Fixed at Start; the speaker state is saved to
 *  it at Stop. */
let speakerSession: { id: string | null; append: boolean } = { id: null, append: false };

/**
 * Start this recording's diarizers from the session's saved speaker cache
 * when it continues the transcript, so each returning voice keeps its
 * `${source}:${k}` id and with it its label. A session without one (older,
 * or never diarized) starts them afresh, as a new recording does.
 */
function beginSpeakerSession(): void {
  const id = getTranscriptSessionId();
  const append = isAppendActive();
  speakerSession = { id, append };
  seedSpeakerStates(append && id ? loadSpeakerState(id) : null);
}

/** Save the speaker caches the diarizers reported on flush. A source that
 *  reported none this time keeps an appended session's earlier state. */
function saveSpeakerSession(): void {
  const { id, append } = speakerSession;
  const reported = takeReportedSpeakerStates();
  if (!id) return;
  const kept = append ? loadSpeakerState(id) ?? {} : {};
  saveSpeakerState(id, { ...kept, ...reported });
}

/** Samples captured so far per source this session: the capture clock ASR
 *  segments and speaker turns are both placed on (0 = the first frame after
 *  Record, 16 kHz). Frames dropped while paused don't advance it. */
const captureClock = new Map<Source, number>();

/** Frames per source this session that reached `onFrame`, and how many of
 *  them were offered to transcription. */
const frameFeed = new Map<Source, { captured: number; toAsr: number }>();

/**
 * Everything the dev diagnostics readout shows: what each capture source
 * delivers (track settings, levels, digital-zero frames) and which sources
 * feed transcription and diarization. `null` with no recording running.
 */
export interface MeetingDiagnostics {
  capture: CaptureDiagnostics;
  /** Seconds on each source's capture clock. */
  clock: Partial<Record<Source, number>>;
  frames: Partial<Record<Source, { captured: number; toAsr: number }>>;
  asr: Partial<Record<Source, LiveAsrFeed>>;
  /** This session transcribes after Stop; `null` until decided. */
  postStop: boolean | null;
  diarization: Partial<Record<Source, DiarizationFeed>>;
}

export function getMeetingDiagnostics(): MeetingDiagnostics | null {
  if (!capture) return null;
  const clock: Partial<Record<Source, number>> = {};
  for (const [source, samples] of captureClock) clock[source] = samples / 16_000;
  return {
    capture: capture.diagnostics(),
    clock,
    frames: Object.fromEntries(frameFeed) as MeetingDiagnostics['frames'],
    asr: getLiveAsrFeed(),
    postStop: sessionPostStop,
    diarization: getDiarizationFeed(),
  };
}

/** Stop every capture track now — synchronously, before the returned
 *  promise's first await — and close the AudioContext after. */
function releaseCapture(): Promise<void> {
  const c = capture;
  capture = null;
  resetLevels();
  return c ? c.dispose() : Promise.resolve();
}

async function teardownCapture(): Promise<void> {
  const released = releaseCapture();
  stopDiarization();
  stopLangId();
  await released;
}

/** A capture track ended (user stopped sharing) — degrade gracefully. */
async function handleSourceEnded(source: Source): Promise<void> {
  if (!capture || sessionOver) return;
  capture.dropSource(source);
  stopDiarizationForSource(source);
  stopLangIdForSource(source);
  const remaining = capture.activeSources;
  if (remaining.length > 0) {
    if (source === 'system') {
      setCallAudioMissing(true);
      setState({ warning: 'System audio share ended — continuing with microphone' });
    } else {
      setState({ warning: 'Microphone track ended — continuing with system audio' });
    }
    return;
  }
  // Last source gone: end the session the way Stop does, so the last live
  // window is flushed and a post-stop device still transcribes the recording.
  await meeting.stop();
  setState({
    error: source === 'system'
      ? 'System audio share ended — session stopped'
      : 'Microphone track ended — session stopped',
  });
}

async function runStop(): Promise<void> {
  sessionOver = true;
  paused = false;
  // Set before anything is awaited, so a `start()` or a second `stop()` in
  // the flush window sees a session that is ending, not a live one.
  setState({ status: 'stopping' });
  // The microphone is released first, before anything is awaited: frames
  // are already dropped from here on (`sessionOver`), and a flush that
  // rejects or never settles must not keep the mic open behind it.
  const released = releaseCapture();
  // Decided *before* the reset: `resetBrowserASR()` clears the session state
  // (including the decoder state the post-stop windows chain through). The
  // session's own answer, not the device's current one, so a mid-session fall
  // to WASM still flushes the live window it was transcribing.
  const postStop = await decideTranscriptionMode();
  // The last partial window still holds speech: transcribe it before the
  // reset drops the decoder state it continues from.
  // The diarizer is flushed alongside, so the last turn is reported and
  // the final segments get its speaker.
  try {
    await Promise.all([postStop ? Promise.resolve() : flushLiveAudio(), flushDiarization()]);
  } catch (err) {
    console.warn('Failed to flush the last audio window', err);
  }
  // The overlaps the last turns closed, once the first pass has read them,
  // while the speech model is still loaded.
  if (!postStop) await flushOverlapRetranscribe();
  resetOverlapRetranscribe();
  saveSpeakerSession();
  resetBrowserASR();
  setCallAudioMissing(false);
  stopDiarization();
  confirmAllSegments();
  stopLangId();
  await released;
  if (postStop) {
    // The whole point of the CPU model's existence here: the recording is
    // transcribed now, as a whole, and the status stays `stopping` until it
    // is — a `stopping` state that means "finishing the transcript" rather
    // than a transcript that appears minutes later with nothing indicating
    // what happened. Never throws (see `transcribeRecordedAudioAfterStop`).
    await transcribeRecordedAudioAfterStop();
    // Its segments are attributed against turns that end where the diarizer
    // stopped, so the recording's last words come out pending; no turn will
    // ever arrive for them now.
    confirmAllSegments();
  }
  setState({ status: 'idle' });
}

export function useMeeting<T>(selector: (s: MeetingState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()), () => selector(INITIAL_STATE));
}

export const meeting = {
  async start(opts: StartOpts): Promise<void> {
    // The previous session is still being stopped: starting now would wipe
    // its transcript before its flush lands, and its teardown would then hit
    // this new session. Waiting instead would lose the click's user
    // activation, which `getDisplayMedia` below needs.
    if (stopPromise) {
      setState({
        warning: isPostStopTranscriptionRunning()
          ? 'Still transcribing the previous recording — wait for it to finish.'
          : 'Still finishing the previous recording — try again in a moment.',
      });
      return;
    }
    const current = getState().status;
    const looksActive =
      current === 'requesting' || current === 'connecting' || current === 'live' || current === 'paused';
    if (looksActive) {
      // A session really is in flight only if this module's own bookkeeping
      // agrees — `sessionOver`/`capture` are set synchronously below, before
      // any await, so during real overlap they're always in sync with the
      // store's status by the time a second call could reach this point.
      // If they disagree, the *store's* status is stale (e.g. a dev-only
      // Fast Refresh re-evaluated this module — resetting its own
      // `sessionOver`/`capture` — without also re-running `store.ts`, which
      // kept its last value) — this is what turned Record into a silent
      // no-op: the guard block a real click forever, with no visible error.
      // Recover instead of refusing to ever start again.
      if (!sessionOver && capture) return;
      console.warn(
        `meeting.start(): status was "${current}" with no active session — resetting and starting anyway.`,
      );
    }
    // A post-stop transcription is still writing segments from the *previous*
    // recording. A second recording started now would share one store, one
    // model and one decoder state with it, and the two transcripts would
    // interleave. Refusing with a reason is the only honest answer: the user
    // can wait (the progress is on screen), and nothing is discarded.
    if (isPostStopTranscriptionRunning()) {
      setState({ warning: 'Still transcribing the previous recording — wait for it to finish.' });
      return;
    }
    sessionOver = false;
    paused = false;
    setCallAudioMissing(false);
    resetLanguageOverride();
    resetSession(opts.mode);
    resetDiarization();
    resetOverlapRetranscribe();
    beginSpeakerSession();
    captureClock.clear();
    frameFeed.clear();
    setState({ status: 'requesting', mode: opts.mode, startedAt: Date.now() });

    // Resolve the backend for this device, and start the buffer. Deliberately
    // NOT awaited here: `getDisplayMedia` below must be called synchronously
    // inside this click's transient user activation, or Safari and Chrome
    // reject it — an `await` here would break Record in a real
    // browser while every other test in this file still passed. It is awaited
    // once the media requests are out (`decideTranscriptionMode`); frames
    // captured before then are held and replayed.
    sessionPostStop = null;
    undecidedFrames = [];
    backendResolved = resolveAsrBackend().then(
      () => {},
      () => {
        // Detection already records its own fallback.
      },
    );
    beginRecordedAudioCapture();

    const cap = new Capture({
      onFrame: (source, pcm) => {
        if (paused || sessionOver) return;
        // Every consumer gets the frame's position on one clock, so a speaker
        // turn and a transcript segment can be matched by time.
        const at = captureClock.get(source) ?? 0;
        captureClock.set(source, at + (pcm.byteLength >> 1));
        const fed = frameFeed.get(source) ?? { captured: 0, toAsr: 0 };
        fed.captured += 1;
        frameFeed.set(source, fed);
        // Transcription is entirely in-browser — there is no other engine
        // to hand this frame to. Every frame is offered to it, whatever its
        // current readiness: `tryBrowserASR` starts the model load itself and
        // reports the phase it reached. Gating this on "already ready" (as
        // this used to) made the first frame unreachable, because readiness
        // was only ever reached *through* this call — a cycle that could
        // never start, i.e. Record recorded silence forever with no error.
        //
        // The exception is a device with no usable WebGPU, where the CPU
        // model cannot transcribe live at all (RTF 1.41 — see
        // `post-stop-transcription.ts`). There the frame is buffered instead,
        // and transcribed as a whole when the user stops.
        if (getBrowserASREnabled()) {
          fed.toAsr += 1;
          routeAsrFrame(source, pcm, at);
        }
        // Held for a second pass over overlapping speech (a no-op until
        // browser ASR installs its transcriber; see overlap-retranscribe.ts).
        pushOverlapAudio(source, pcm, at);
        // Optional and independent of ASR readiness — a no-op when
        // diarization/langid aren't consented/cached/started yet (see
        // diarization-bridge.ts / langid-bridge.ts).
        pushDiarizationAudio(source, pcm, at);
        pushLangIdAudio(source, pcm);
      },
      onLevel: (source, rms) => pushLevel(source, rms),
      // A share that attached but carries no sound is call audio missing
      // too; the mic has been switched to hearing the speakers meanwhile.
      onCallAudioSilent: (silent) => {
        if (capture === cap && !sessionOver) setCallAudioMissing(silent);
      },
      onWarning: (warning) => {
        if (capture === cap && !sessionOver) setState({ warning });
      },
      onSourceEnded: (source) => {
        handleSourceEnded(source).catch((err) => {
          console.warn('Failed to handle ended audio source', err);
          setState({ error: err instanceof Error ? err.message : 'Audio source ended unexpectedly' });
        });
      },
    });
    capture = cap;
    try {
      await cap.start(opts.mode, opts.micDeviceId);
    } catch (err) {
      // Stopped (or replaced by a newer session) while starting: the stop
      // already disposed this capture and owns the status now.
      if (capture !== cap) return;
      sessionOver = true;
      await teardownCapture();
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Could not start audio capture',
      });
      return;
    }

    if (sessionOver || capture !== cap) return; // e.g. a track ended, or Stop, while starting
    // "Both"/"system" wanted call audio but it didn't attach (declined,
    // unsupported, no audio track) — silent per Capture.start()'s contract;
    // BottomDock's indicator is the only surface for this, no warning here.
    const wantedSystem = opts.mode === 'system' || opts.mode === 'both';
    setCallAudioMissing(wantedSystem && !cap.activeSources.includes('system'));

    // A CPU-only device buffers this recording instead of transcribing it, so
    // the model must NOT be loaded here: a 652 MB session built at the moment
    // Record is pressed would compete for memory with the audio capture, for a
    // load that is not needed until the user stops.
    const postStop = await decideTranscriptionMode();
    if (sessionOver || capture !== cap) return;

    // Start the speech model now, at the moment Record is pressed, rather
    // than relying on a capture frame arriving and finding it ready. Any
    // failure lands in browser-asr's own state (phase + message), which the
    // UI renders — `meeting.start()` itself still succeeds, because audio is
    // being captured either way.
    //
    // The optional models deliberately wait for this to settle. Starting all
    // three at once meant the speech model's ~670 MB (or several GB) and
    // diarization's + language-ID's sessions were all growing arenas in the
    // same instant, and that peak is what a Safari WebContent process died
    // trying to allocate. Nothing is lost by going second: diarization needs a
    // window of audio before it can emit a turn, and language ID waits for
    // ~5s of speech before its first detection.
    //
    // On a post-stop device there is no speech model to start, so the
    // optional models do not wait for one that will not be started.
    const speechReady = postStop
      ? Promise.resolve(false)
      : ensureBrowserASRReady().catch((err: unknown) => {
          console.error('Speech model warm-up failed', err);
          return false;
        });
    speechReady
      .then(() => {
        // A session that ended while the model was loading must not resurrect
        // two extra model-loading pipelines behind the user's back.
        // A newer session resets `sessionOver`, so the capture is compared
        // too: this one's sources are gone once it is disposed.
        if (sessionOver || capture !== cap) return;
        // Non-blocking: a no-op when the diarization/langid models aren't
        // consented/cached yet — recording went live either way (see
        // diarization-bridge.ts / langid-bridge.ts).
        startDiarization(cap.activeSources);
        startLangId(cap.activeSources);
      });

    setState({ status: 'live', error: null, warning: cap.warning });
  },

  stop(): Promise<void> {
    if (stopPromise) return stopPromise;
    const current = getState().status;
    if (current === 'idle' || current === 'stopping') return Promise.resolve();
    stopPromise = runStop().finally(() => {
      stopPromise = null;
    });
    return stopPromise;
  },

  /**
   * End whatever session is running because the page or its view is going
   * away (pagehide, the meeting view unmounting). Every track is stopped
   * before this returns its promise, so a caller that cannot wait still
   * turns the microphone off.
   */
  release(): Promise<void> {
    const stopped = meeting.stop();
    void releaseCapture();
    return stopped;
  },

  pause(): void {
    if (getState().status !== 'live' || sessionOver) return;
    paused = true;
    capture?.suspend()?.catch((err) => {
      console.warn('Failed to suspend audio capture', err);
      setState({ warning: err instanceof Error ? err.message : 'Failed to suspend audio capture' });
    });
    setState({ status: 'paused' });
  },

  resume(): void {
    if (getState().status !== 'paused' || sessionOver) return;
    paused = false;
    capture?.resume()?.catch((err) => {
      console.warn('Failed to resume audio capture', err);
      setState({ warning: err instanceof Error ? err.message : 'Failed to resume audio capture' });
    });
    setState({ status: 'live' });
  },

  renameSpeaker(id: string, label: string): void {
    storeRenameSpeaker(id, label);
  },

  /**
   * "Fix this word": add `word` to the word list with `heard` (what the
   * transcript shows) as how it was misheard, and correct the open
   * transcript straight away. Later lines get it from the store.
   */
  fixWord(heard: string, word: string): void {
    if (addFixedWord(heard, word)) applyVocabularyToTranscript();
  },

  /**
   * Mid-session language override, or `'auto'` to release it back to live
   * detection (see `langid-bridge.ts`). Only affects the *displayed*
   * `MeetingState.language` — browser ASR (the only transcription engine)
   * is a Dutch-only pilot with no runtime language switch yet (see
   * `DEFAULT_BROWSER_ASR_CONFIG` in `@/lib/asr/browser`), so this can't
   * change what gets transcribed, only what's shown as the detected
   * language.
   */
  setLanguage(code: string): void {
    setLanguageOverride(code);
  },

  /** Enable browser-native ASR (parakeet.js), the only transcription engine. Lazy-loads the model on first frame. */
  enableBrowserASR(): void {
    enableBrowserASR();
  },

  /** Disable browser-native ASR. No transcription runs until it's re-enabled. */
  disableBrowserASR(): void {
    disableBrowserASR();
  },

  subscribeLevels(cb: (l: Levels) => void): () => void {
    return storeSubscribeLevels(cb);
  },

  async listMicDevices(): Promise<MediaDeviceInfo[]> {
    const mediaDevices =
      typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!mediaDevices?.enumerateDevices) return [];
    const devices = await mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  },
};

// Leaving the page (reload, close, navigating off-site) must turn the
// microphone off even though nothing gets to await the stop.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', () => {
    void meeting.release().catch(() => {});
  });
}
