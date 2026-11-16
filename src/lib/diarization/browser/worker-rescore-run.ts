import { isEmbedderCached } from './downloader';
import { Mutex } from './mutex';
import { SpeakerEmbedder } from './rescore/embedder';
import type { SpeakerTurn, WorkerOutMessage } from './types';
import { loadEmbedderBytes, releaseModel } from './worker-model';
import type { WorkerRescore } from './worker-rescore';

const rescoreMutex = new Mutex();

export async function shouldRescore(rescore: WorkerRescore | undefined): Promise<boolean> {
  if (!rescore?.gateOpen) return false;
  return isEmbedderCached().catch(() => false);
}

export function runRescore(
  id: string,
  rescore: WorkerRescore,
  canReleaseModel: () => boolean,
  post: (message: WorkerOutMessage) => void,
): Promise<void> {
  return rescoreMutex.run(async () => {
    if (canReleaseModel()) await releaseModel();
    const embedder = new SpeakerEmbedder(loadEmbedderBytes);
    let turns: SpeakerTurn[] | null = null;
    try {
      turns = await rescore.run(embedder);
    } catch (err) {
      console.warn('[diarization] rescore failed', err);
    }
    await embedder.dispose().catch(() => undefined);
    await rescore.discard();
    post({ type: 'rescored', id, turns: turns ?? undefined });
  });
}
