import { computeLogMelSpectrogram } from './mel';
import { detectLanguage } from './detect-language';
import { languageNameFor } from './languages';
import { ensureModel } from './model-cache';
import { serialised } from './serialised';
import {
  createSourceState,
  MIN_SAMPLES_BEFORE_FIRST_RUN,
  RECHECK_INTERVAL_SAMPLES,
  RETRY_AFTER_SILENCE_SAMPLES,
} from './source-state';
import { countSpeechSamples } from './speech';
import { MIN_SPEECH_SAMPLES, pickSupportedLanguage } from './decision';
import type { SourceState, WorkerInMessage, WorkerOutMessage } from './types';

const sources = new Map<string, SourceState>();

function post(message: WorkerOutMessage): void {
  postMessage(message);
}

async function maybeRun(id: string, state: SourceState): Promise<void> {
  if (state.running) return;
  if (state.window.length < MIN_SAMPLES_BEFORE_FIRST_RUN) return;
  if (state.hasRunOnce && state.samplesSinceLastRun < state.recheckAfterSamples) return;

  state.running = true;
  state.hasRunOnce = true;
  state.samplesSinceLastRun = 0;
  try {
    const top = await serialised(async () => {
      if (sources.get(id) !== state) return undefined;
      const window = state.window.toArray();
      if (countSpeechSamples(window) < MIN_SPEECH_SAMPLES) {
        state.recheckAfterSamples = RETRY_AFTER_SILENCE_SAMPLES;
        return undefined;
      }
      state.recheckAfterSamples = RECHECK_INTERVAL_SAMPLES;
      const loaded = await ensureModel(id, post);
      return pickSupportedLanguage(await detectLanguage(loaded, computeLogMelSpectrogram(window)));
    });
    if (top && sources.get(id) === state) {
      post({ type: 'language', id, code: top.code, name: languageNameFor(top.code), confidence: top.confidence });
    }
  } catch (err) {
    post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
  } finally {
    state.running = false;
  }
}

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    if (!sources.has(msg.id)) sources.set(msg.id, createSourceState());
  } else if (msg.type === 'push') {
    const state = sources.get(msg.id);
    if (!state) return;
    state.window.push(msg.samples);
    state.samplesSinceLastRun += msg.samples.length;
    void maybeRun(msg.id, state);
  } else if (msg.type === 'dispose') {
    sources.delete(msg.id);
  }
};
