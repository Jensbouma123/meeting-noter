import {
  beginRecordedAudioCapture,
  ensureBrowserASRReady,
  resolveAsrBackend,
} from './browser-asr';
import { Capture } from './capture';
import { setCallAudioMissing } from './call-audio-missing';
import { captureClock, frameFeed } from './diagnostics';
import { resetDiarization, startDiarization } from './diarization-bridge';
import { routeCapturedFrame } from './frame-router';
import { resetLanguageOverride, startLangId } from './langid-bridge';
import { resetOverlapRetranscribe } from './overlap-retranscribe';
import { beginSpeakerSession } from './speaker-session';
import { disposeSharedEmbedder } from '@/lib/semantic-search/service';
import { degradeAfterSourceEnded } from './source-ended';
import { session } from './session-state';
import { startIsBlocked } from './session-start-guard';
import { teardownCapture } from './capture-release';
import { pushLevel, resetSession, setState } from './store';
import { decideTranscriptionMode } from './transcription-mode';
import type { StartOpts } from './types';

function resetSessionBookkeeping(opts: StartOpts): void {
  session.sessionOver = false;
  session.paused = false;
  setCallAudioMissing(false);
  resetLanguageOverride();
  resetSession(opts.mode);
  resetDiarization();
  resetOverlapRetranscribe();
  beginSpeakerSession();
  captureClock.clear();
  frameFeed.clear();
  session.sawActiveCapture = true;
  setState({ status: 'requesting', mode: opts.mode, startedAt: Date.now() });
  disposeSharedEmbedder();
}

function beginBackendResolution(): void {
  session.sessionPostStop = null;
  session.undecidedFrames = [];
  session.backendResolved = resolveAsrBackend().then(
    () => {},
    () => {},
  );
  beginRecordedAudioCapture();
}

function createCapture(): Capture {
  const cap: Capture = new Capture({
    onFrame: routeCapturedFrame,
    onLevel: (source, rms) => pushLevel(source, rms),
    onCallAudioSilent: (silent) => {
      if (session.capture === cap && !session.sessionOver) setCallAudioMissing(silent);
    },
    onWarning: (warning) => {
      if (session.capture === cap && !session.sessionOver) setState({ warning });
    },
    onSourceEnded: (source) => {
      degradeAfterSourceEnded(source).catch((err) => {
        console.warn('Failed to handle ended audio source', err);
        setState({ error: err instanceof Error ? err.message : 'Audio source ended unexpectedly' });
      });
    },
  });
  return cap;
}

function startOptionalModelsAfterSpeech(cap: Capture, postStop: boolean): void {
  const speechReady = postStop
    ? Promise.resolve(false)
    : ensureBrowserASRReady().catch((err: unknown) => {
        console.error('Speech model warm-up failed', err);
        return false;
      });
  speechReady.then(() => {
    if (session.sessionOver || session.capture !== cap) return;
    startDiarization(cap.activeSources);
    startLangId(cap.activeSources);
  });
}

async function startCapture(cap: Capture, opts: StartOpts): Promise<boolean> {
  try {
    await cap.start(opts.mode, opts.micDeviceId);
    return true;
  } catch (err) {
    if (session.capture !== cap) return false;
    session.sessionOver = true;
    await teardownCapture();
    setState({
      status: 'error',
      error: err instanceof Error ? err.message : 'Could not start audio capture',
    });
    return false;
  }
}

export async function startMeeting(opts: StartOpts): Promise<void> {
  if (startIsBlocked()) return;
  resetSessionBookkeeping(opts);
  beginBackendResolution();

  const cap = createCapture();
  session.capture = cap;
  if (!(await startCapture(cap, opts))) return;

  if (session.sessionOver || session.capture !== cap) return;
  const wantedSystem = opts.mode === 'system' || opts.mode === 'both';
  setCallAudioMissing(wantedSystem && !cap.activeSources.includes('system'));

  const postStop = await decideTranscriptionMode();
  if (session.sessionOver || session.capture !== cap) return;

  startOptionalModelsAfterSpeech(cap, postStop);
  setState({ status: 'live', error: null, warning: cap.warning });
}
