import { runInsights } from '@/lib/semantic-search/insights/run-insights';
import { isSearchModelReady } from '@/lib/semantic-search/model-gate';
import { indexMeeting, withEmbedder } from '@/lib/semantic-search/service';
import { session } from './session-state';
import { getState, subscribe } from './store-core';
import { getTranscriptSessionId } from './transcript-session';

async function indexFinishedMeeting(): Promise<void> {
  if (getState().status !== 'idle') return;
  const sessionId = getTranscriptSessionId();
  const { segments } = getState();
  if (!isSearchModelReady()) return;
  if (!sessionId || !segments.some((s) => s.final && s.text.trim().length > 0)) return;

  try {
    await withEmbedder(async (embedder) => {
      await indexMeeting(sessionId, { embedder });
      await runInsights(sessionId, embedder).catch((err) => console.warn('Insight extraction failed', err));
    });
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
