import { bufferRecordedAudio, isPostStopTranscriptionOnly, pushLiveAudio } from './browser-asr';
import { session } from './session-state';
import type { Source } from './types';

const BACKEND_DECISION_TIMEOUT_MS = 5000;

export function routeAsrFrame(source: Source, pcm: ArrayBuffer, at: number): void {
  if (session.sessionPostStop === null) {
    session.undecidedFrames.push({ source, pcm, at });
  } else if (session.sessionPostStop) {
    bufferRecordedAudio(source, pcm);
  } else {
    pushLiveAudio(source, pcm, at);
  }
}

async function waitForBackendProbe(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    session.backendResolved,
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, BACKEND_DECISION_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
}

export async function decideTranscriptionMode(): Promise<boolean> {
  if (session.sessionPostStop === null) await waitForBackendProbe();
  if (session.sessionPostStop === null) {
    session.sessionPostStop = isPostStopTranscriptionOnly();
    const held = session.undecidedFrames;
    session.undecidedFrames = [];
    for (const f of held) routeAsrFrame(f.source, f.pcm, f.at);
  }
  return session.sessionPostStop;
}
