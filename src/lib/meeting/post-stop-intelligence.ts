import { indexMeeting } from '@/lib/semantic-search/service';
import { session } from './session-state';
import { getState, getTranscriptSessionId, subscribe } from './store';

async function indexFinishedMeeting(): Promise<void> {
  if (getState().status !== 'idle') return;
  const sessionId = getTranscriptSessionId();
  const { segments } = getState();
  if (!sessionId || !segments.some((s) => s.final && s.text.trim().length > 0)) return;

  try {
    await indexMeeting(sessionId);
  } catch (err) {
    console.warn('Semantic indexing failed', err);
  }
}

export function schedulePostStopIntelligence(pendingStop: Promise<void> | null): void {
  session.postStopChain = session.postStopChain
    .catch(() => {})
    .then(async () => {
      if (pendingStop) await pendingStop.catch(() => {});
      await Promise.resolve();
      await indexFinishedMeeting();
    });
}

subscribe(() => {
  const { status } = getState();
  if (status === 'error') {
    session.sawActiveCapture = false;
    return;
  }
  if (status !== 'idle') {
    session.sawActiveCapture = true;
    return;
  }
  if (!session.sawActiveCapture) return;
  session.sawActiveCapture = false;
  schedulePostStopIntelligence(session.stopPromise);
});
