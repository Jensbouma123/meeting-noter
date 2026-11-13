import { audioRejection } from './audio-rejection';
import { EG2_MODEL_ID } from './constants';
import { defaultDevice } from './default-device';
import { createModelLoader } from './model-loader';
import { toUnitRows } from './to-unit-rows';
import type { EmbeddingGemma2, EmbeddingGemma2Deps, EmbeddingGemma2Options } from './types';

const noop = () => {};

export function createEmbeddingGemma2(
  options: EmbeddingGemma2Options = {},
  deps: EmbeddingGemma2Deps = {},
): EmbeddingGemma2 {
  const loader = createModelLoader({
    modelId: options.modelId ?? EG2_MODEL_ID,
    device: options.device ?? defaultDevice(),
    dtype: { model: 'q4', audio_encoder: 'q4', ...options.dtype },
    onProgress: options.onProgress,
    importTransformers: deps.importTransformers ?? (() => import('@huggingface/transformers')),
  });

  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    queue = run.then(noop, noop);
    return run;
  };

  return {
    embedText(texts, { prefix = '' } = {}) {
      return enqueue(async () => {
        if (texts.length === 0) return [];
        const s = await loader.load(false);
        const inputs = await s.processor(texts.map((text) => prefix + text));
        const { sentence_embedding } = await s.model(inputs);
        return toUnitRows(sentence_embedding, texts.length);
      });
    },

    embedAudio(samples) {
      const rejection = audioRejection(samples);
      if (rejection) return Promise.reject(rejection);
      return enqueue(async () => {
        const s = await loader.load(true);
        const inputs = await s.processor(null, null, samples);
        const { sentence_embedding } = await s.model(inputs);
        return toUnitRows(sentence_embedding, 1)[0];
      });
    },

    dispose() {
      return enqueue(loader.release);
    },
  };
}
