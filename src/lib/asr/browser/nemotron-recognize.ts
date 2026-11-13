import type { BrowserRecognizeResult } from './types';

export async function recognizeSafely(
  run: () => Promise<{ text: string; words: BrowserRecognizeResult['words'] }>,
  onError: (message: string) => void,
): Promise<BrowserRecognizeResult> {
  try {
    const result = await run();
    return { text: result.text, words: result.words, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onError(`Browser ASR transcription error: ${message}`);
    return { text: '', words: [], error: message };
  }
}
