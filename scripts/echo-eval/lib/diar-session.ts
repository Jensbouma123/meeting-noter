const OVERLAP_FLUSH_TIMEOUT_MS = 120_000;
const ACTIVE_POLL_MS = 20;

export async function resetLiveSession(): Promise<void> {
  const { session } = await import('@/lib/meeting/session-state');
  const { resetDiarization } = await import('@/lib/meeting/diarization-bridge');
  const { resetOverlapRetranscribe } = await import('@/lib/meeting/overlap-retranscribe');
  const { resetSeparation } = await import('@/lib/meeting/overlap-separate');
  const { beginSpeakerSession } = await import('@/lib/meeting/speaker-session');
  const { captureClock, frameFeed } = await import('@/lib/meeting/diagnostics');
  session.sessionOver = false;
  session.paused = false;
  resetDiarization();
  resetOverlapRetranscribe();
  resetSeparation();
  beginSpeakerSession();
  captureClock.clear();
  frameFeed.clear();
  session.sessionPostStop = null;
  session.undecidedFrames = [];
  session.backendResolved = Promise.resolve();
}

export async function waitActive(timeoutMs: number): Promise<void> {
  const { getState } = await import('@/lib/meeting/store-core');
  const until = Date.now() + timeoutMs;
  while (getState().diarization?.phase !== 'active') {
    const status = getState().diarization;
    if (status?.phase === 'unavailable') throw new Error(`diarizer unavailable: ${status.reason}`);
    if (Date.now() > until) throw new Error(`diarizer never active: ${JSON.stringify(status)}`);
    await new Promise((resolve) => setTimeout(resolve, ACTIVE_POLL_MS));
  }
}

export async function assertLiveMode(): Promise<void> {
  const { decideTranscriptionMode } = await import('@/lib/meeting/transcription-mode');
  if (await decideTranscriptionMode()) throw new Error('session decided post-stop transcription; live path expected');
}

export async function flushLiveSpeakers(flushLiveAudio: () => Promise<unknown>): Promise<void> {
  const { flushDiarization, stopDiarization } = await import('@/lib/meeting/diarization-bridge');
  const overlap = await import('@/lib/meeting/overlap-retranscribe');
  await Promise.all([flushLiveAudio(), flushDiarization()]);
  await overlap.flushOverlapRetranscribe(OVERLAP_FLUSH_TIMEOUT_MS);
  overlap.resetOverlapRetranscribe();
  stopDiarization();
}
