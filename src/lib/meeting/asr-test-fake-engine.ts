import type { AsrEngineTestState, TimedTestWord } from './types/asr-test';

interface FakeEngineEvents {
  onSegment: (seg: unknown) => void;
  onStatusChange: (status: string) => void;
  onError: (message: string) => void;
  onLoadProgress?: (progress: { stage: string; done: number; total: number }) => void;
}

export function createFakeEngine(state: AsrEngineTestState) {
  return class FakeBrowserASREngine {
    isReady = false;
    constructor(
      public config: unknown,
      public events: FakeEngineEvents,
    ) {
      state.instances.push(this);
      state.encoderQuants.push((config as { encoderQuant?: string }).encoderQuant);
    }
    async ensureLoaded(): Promise<void> {
      const quant = (this.config as { encoderQuant?: string }).encoderQuant;
      if (state.failLoad || quant === state.failLoadForEncoder) {
        throw new Error(`${state.failLoadMessage} (${quant ?? 'unknown'})`);
      }
      if (state.loadGate) await state.loadGate;
      for (let done = 0; done <= state.load.files; done += 1) {
        this.events.onLoadProgress?.({ stage: 'files', done, total: state.load.files });
      }
      this.events.onLoadProgress?.({ stage: 'session', done: 1, total: 1 });
      this.events.onLoadProgress?.({ stage: 'warmup', done: 1, total: 1 });
      this.isReady = true;
    }
    async transcribe(
      audio: Float32Array,
      source: 'mic' | 'system',
      speaker: string,
      isFinal: boolean,
    ): Promise<{ segments: unknown[]; language: null; error: string | null }> {
      state.transcribed.push({
        samples: audio.length,
        firstSample: audio.length > 0 ? audio[0] : Number.NaN,
        source,
        isFinal,
      });
      if (state.failTranscribe) {
        const message = 'inference exploded';
        this.events.onError(`Browser ASR transcription error: ${message}`);
        return { segments: [], language: null, error: message };
      }
      this.events.onSegment({
        id: `seg-${state.transcribed.length}`,
        source,
        speaker,
        text: state.transcribeWords ? state.transcribeWords.map((w) => w.text).join(' ') : 'hello there',
        start: 0,
        end: 1,
        final: isFinal,
        ...(state.transcribeWords ? { words: state.transcribeWords } : {}),
      });
      return { segments: [{ id: 'seg-1' }], language: null, error: null };
    }
    async recognize(
      audio: Float32Array,
    ): Promise<{ text: string; words: TimedTestWord[]; error: string | null }> {
      state.recognized.push({
        samples: audio.length,
        firstSample: audio.length > 0 ? audio[0] : Number.NaN,
        peak: audio.reduce((m, x) => Math.max(m, Math.abs(x)), 0),
      });
      if (state.hold) await state.hold;
      if (state.failTranscribe) {
        const message = 'inference exploded';
        this.events.onError(`Browser ASR transcription error: ${message}`);
        return { text: '', words: [], error: message };
      }
      const seconds = audio.length / 16_000;
      const words = (state.words ?? ((s: number) => [{ text: 'hello', start: 0, end: Math.min(0.5, s) }]))(seconds)
        .filter((w) => w.end <= seconds);
      return { text: words.map((w) => w.text).join(' '), words, error: null };
    }
    async stop(): Promise<void> {
      this.isReady = true;
    }
    disable(): void {
      this.isReady = false;
    }
  };
}
