import { listSessions } from '../meeting/session-crud';
import { isCaptureActive } from '../meeting/transcript-session';
import type { BackfillDeps, BackfillProgress } from './backfill.types';
import { indexMeeting, withEmbedder } from './service';
import { listIndexedMeetingIds } from './store';
import type { Embedder } from './types';

const defaultPause = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

function pendingIds(deps: BackfillDeps): string[] {
  const ids = (deps.listMeetingIds ?? (() => listSessions().map((s) => s.sessionId)))();
  const indexed = new Set(
    deps.store === undefined ? listIndexedMeetingIds() : listIndexedMeetingIds(deps.store),
  );
  return ids.filter((id) => !indexed.has(id) && !deps.attempted?.has(id));
}

async function runLoop(
  embedder: Embedder,
  ids: string[],
  deps: BackfillDeps,
): Promise<BackfillProgress> {
  const captureActive = deps.captureActive ?? isCaptureActive;
  const progress: BackfillProgress = { total: ids.length, done: 0, failed: 0, aborted: false };
  deps.onProgress?.({ ...progress });
  for (const id of ids) {
    if (deps.signal?.aborted || captureActive()) {
      progress.aborted = true;
      break;
    }
    deps.attempted?.add(id);
    try {
      await indexMeeting(id, { ...deps, embedder, captureActive });
    } catch {
      progress.failed++;
    }
    progress.done++;
    deps.onProgress?.({ ...progress });
    await (deps.pause ?? defaultPause)();
  }
  return progress;
}

export async function backfillIndex(deps: BackfillDeps = {}): Promise<BackfillProgress> {
  const ids = pendingIds(deps);
  if (ids.length === 0) return { total: 0, done: 0, failed: 0, aborted: false };
  if (deps.embedder) return runLoop(deps.embedder, ids, deps);
  return withEmbedder((embedder) => runLoop(embedder, ids, deps));
}
