import { CHUNK_SAMPLES, NO_POST_STOP_PROGRESS } from './post-stop-constants';
import { setProgress } from './post-stop-progress';
import { postStopState, releaseBufferedAudio } from './post-stop-state';
import { chunkWindowsFromChunks } from './post-stop-windows';
import type { ChunkTranscriber } from './types/post-stop';

export async function transcribeRecordedAudio(
  transcribe: ChunkTranscriber,
): Promise<boolean> {
  if (postStopState.running) return false;
  const sources = [...postStopState.buffers.entries()];
  const sizes = new Map(
    sources.map(([source, chunks]) => [source, chunks.reduce((sum, c) => sum + c.length, 0)]),
  );
  const offsets = new Map(postStopState.droppedSamples);
  releaseBufferedAudio();
  const droppedSeconds = postStopState.progress.droppedSeconds;
  const work = sources
    .map(([source, chunks]) => ({ source, chunks, length: sizes.get(source) ?? 0 }))
    .filter((entry) => entry.length > 0);
  if (work.length === 0) {
    setProgress({ ...NO_POST_STOP_PROGRESS, phase: 'done', droppedSeconds });
    return true;
  }

  const total = work.reduce(
    (sum, entry) => sum + Math.max(1, Math.ceil(entry.length / CHUNK_SAMPLES)),
    0,
  );
  postStopState.running = true;
  setProgress({
    phase: 'transcribing',
    chunksDone: 0,
    chunksTotal: total,
    percent: 0,
    source: work[0].source,
    droppedSeconds,
    error: null,
  });

  let done = 0;
  let firstError: string | null = null;
  try {
    for (const { source, chunks } of work) {
      const base = offsets.get(source) ?? 0;
      for (const { window, startSample } of chunkWindowsFromChunks(chunks)) {
        setProgress({ ...postStopState.progress, source, percent: Math.round((done / total) * 100) });
        try {
          await transcribe(window, source, true, base + startSample);
        } catch (err) {
          firstError ??= err instanceof Error ? err.message : String(err);
        }
        done += 1;
        setProgress({
          ...postStopState.progress,
          source,
          chunksDone: done,
          percent: Math.round((done / total) * 100),
        });
      }
    }
    if (firstError !== null) {
      setProgress({ ...postStopState.progress, phase: 'error', chunksDone: done, error: firstError, source: null });
      return false;
    }
    setProgress({
      ...postStopState.progress,
      phase: 'done',
      chunksDone: done,
      chunksTotal: total,
      percent: 100,
      source: null,
    });
    return true;
  } finally {
    postStopState.running = false;
  }
}
