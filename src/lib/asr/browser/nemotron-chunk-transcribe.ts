import type { BrowserTranscribeResult } from './types';
import type { NemotronChunk, NemotronChunkTranscribeDeps } from './nemotron-chunk-transcribe.types';

export async function transcribeNemotronChunk(
  chunk: NemotronChunk,
  deps: NemotronChunkTranscribeDeps,
): Promise<BrowserTranscribeResult> {
  try {
    const result = await deps.recognize();
    const { audio, source, speakerLabel, isFinal } = chunk;
    const segments = deps.segmenter.build(result.text, result.words, audio.length, source, speakerLabel, isFinal);
    return { segments, language: deps.language(), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.onError(`Browser ASR transcription error: ${message}`);
    return { segments: [], language: null, error: message };
  }
}
