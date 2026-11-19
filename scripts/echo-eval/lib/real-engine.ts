import { createFakeEngine } from '@/lib/meeting/asr-test-fake-engine';
import type { AsrEngineTestState } from '@/lib/meeting/types/asr-test';
import { realTranscribe } from './asr-client';

/** The app's engine contract, with recognize() backed by the real Parakeet model via the app's own recognizeWindow. */
export function createRealEngine(state: AsrEngineTestState) {
  return class RealEngine extends createFakeEngine(state) {
    async recognize(audio: Float32Array) {
      const { recognizeWindow } = await import('@/lib/asr/browser/parakeet-recognize');
      const model = { transcribe: (a: Float32Array, sr: number, o: object) => realTranscribe(a, sr, o) };
      return recognizeWindow(model as never, audio, () => {});
    }
  };
}
