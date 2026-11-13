import { loadSessionTranscript } from '@/lib/meeting/session-transcript-storage';
import { isCaptureActive } from '@/lib/meeting/transcript-session';
import type { Embedder } from '../types';
import { extractInsights } from './extract';
import { loadInsights, saveInsights } from './store';
import { pushInsights } from './sync';
import { INSIGHTS_VERSION } from './version';

export async function runInsights(meetingId: string, embedder: Embedder): Promise<void> {
  if (isCaptureActive()) return;
  const session = loadSessionTranscript(meetingId);
  if (!session) return;
  const items = await extractInsights(session.segments, embedder);
  const set = { version: INSIGHTS_VERSION, items, dismissed: loadInsights(meetingId).dismissed };
  saveInsights(meetingId, set);
  await pushInsights(meetingId, set);
}
