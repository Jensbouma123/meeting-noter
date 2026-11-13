import { NOT_READY_RECOGNIZE, NOT_READY_TRANSCRIBE } from './engine-not-ready';
import type { WorkerCallChannel } from './worker-call-channel';
import type { BrowserASREvents, BrowserRecognizeResult, BrowserTranscribeResult } from './types';

export async function transcribeRemotely(
  channel: WorkerCallChannel,
  events: Pick<BrowserASREvents, 'onError'>,
  audio: Float32Array,
  source: 'mic' | 'system',
  speakerLabel: string,
  isFinal: boolean,
): Promise<BrowserTranscribeResult> {
  const copy = audio.slice();
  try {
    const result = await channel.call(
      { method: 'transcribe', args: { audio: copy, source, speakerLabel, isFinal } },
      [copy.buffer],
    );
    return (result as BrowserTranscribeResult | undefined) ?? NOT_READY_TRANSCRIBE;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    events.onError(`Browser ASR transcription error: ${message}`);
    return { segments: [], language: null, error: message };
  }
}

export async function recognizeRemotely(
  channel: WorkerCallChannel,
  events: Pick<BrowserASREvents, 'onError'>,
  audio: Float32Array,
): Promise<BrowserRecognizeResult> {
  const copy = audio.slice();
  try {
    const result = await channel.call({ method: 'recognize', args: { audio: copy } }, [copy.buffer]);
    return (result as BrowserRecognizeResult | undefined) ?? NOT_READY_RECOGNIZE;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    events.onError(`Browser ASR transcription error: ${message}`);
    return { text: '', words: [], error: message };
  }
}
