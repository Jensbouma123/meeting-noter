import {
  flushLiveAudio,
  resetBrowserASR,
  transcribeRecordedAudioAfterStop,
} from './browser-asr';
import { releaseCapture } from './capture-release';
import { setCallAudioMissing } from './call-audio-missing';
import { flushDiarization, stopDiarization } from './diarization-bridge';
import { stopLangId } from './langid-bridge';
import { flushOverlapRetranscribe, resetOverlapRetranscribe } from './overlap-retranscribe';
import { schedulePostStopIntelligence } from './post-stop-intelligence';
import { saveSpeakerSession } from './speaker-session';
import { session } from './session-state';
import { confirmAllSegments, getState, setState } from './store';
import { decideTranscriptionMode } from './transcription-mode';

async function flushLastWindow(postStop: boolean): Promise<void> {
  try {
    await Promise.all([postStop ? Promise.resolve() : flushLiveAudio(), flushDiarization()]);
  } catch (err) {
    console.warn('Failed to flush the last audio window', err);
  }
}

async function runStop(): Promise<void> {
  session.sessionOver = true;
  session.paused = false;
  setState({ status: 'stopping' });
  const released = releaseCapture();
  const postStop = await decideTranscriptionMode();
  await flushLastWindow(postStop);
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
    await transcribeRecordedAudioAfterStop();
    confirmAllSegments();
  }
  setState({ status: 'idle' });
  if (session.sawActiveCapture) {
    session.sawActiveCapture = false;
    schedulePostStopIntelligence(session.stopPromise);
  }
}

export function stopMeeting(): Promise<void> {
  if (session.stopPromise) return session.stopPromise;
  const current = getState().status;
  if (current === 'idle' || current === 'stopping') return Promise.resolve();
  session.stopPromise = runStop().finally(() => {
    session.stopPromise = null;
  });
  return session.stopPromise;
}
