/**
 * Browser loader for google/embeddinggemma-2 (transformers.js ONNX export).
 *
 * Nothing is downloaded or imported until the first embed call. Text and audio
 * are lazy and independent: a text-only caller never fetches the audio encoder,
 * and the first audio call reloads the model with the audio encoder attached.
 * All vectors are L2-normalised 768-d Float32Arrays, so dot product = cosine.
 */
import type * as TransformersModule from '@huggingface/transformers';

export const EG2_MODEL_ID = 'onnx-community/embeddinggemma-2-ONNX';
export const EG2_DIM = 768;
export const EG2_AUDIO_SAMPLE_RATE = 16_000;
export const EG2_MAX_AUDIO_SECONDS = 327;

export type EG2DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
export type EG2Device = 'webgpu' | 'wasm' | 'cpu';

export interface EmbeddingGemma2Options {
  /** Default: 'webgpu' when navigator.gpu exists, 'wasm' in browsers without it, 'cpu' in Node. */
  device?: EG2Device;
  /** Per-component precision. Default: q4 text model, q4 audio encoder (~175 MB + ~189 MB). */
  dtype?: Partial<{ model: EG2DType; audio_encoder: EG2DType }>;
  /** transformers.js progress callback (download and init events). */
  onProgress?: (info: unknown) => void;
  /** Override the Hugging Face repo, e.g. a self-hosted mirror. */
  modelId?: string;
}

export interface EmbedTextOptions {
  /**
   * Task prefix prepended to every text, e.g. 'task: search result | query: '
   * or 'title: none | text: '. Default '' (raw text). Prefixes apply to text only.
   */
  prefix?: string;
}

export interface EmbeddingGemma2 {
  /** One normalised 768-d vector per input text. Lazily loads the text model. */
  embedText(texts: string[], options?: EmbedTextOptions): Promise<Float32Array[]>;
  /** One normalised 768-d vector for mono 16 kHz samples (max 327 s). Lazily loads the audio encoder. */
  embedAudio(samples: Float32Array): Promise<Float32Array>;
  /** Frees the ONNX sessions. The instance cannot be reused afterwards; create a new one. */
  dispose(): Promise<void>;
}

export interface EmbeddingGemma2Deps {
  /** Test seam. Defaults to a dynamic import so the library stays out of the initial bundle. */
  importTransformers?: () => Promise<typeof TransformersModule>;
}

interface LoadedState {
  model: { dispose(): Promise<unknown>; (inputs: unknown): Promise<{ sentence_embedding: TensorLike }> };
  processor: (...args: unknown[]) => Promise<unknown>;
  hasAudio: boolean;
}

interface TensorLike {
  data: ArrayLike<number>;
  dims: readonly number[];
}

const noop = () => {};

function defaultDevice(): EG2Device {
  if (typeof navigator === 'undefined') return 'cpu';
  return 'gpu' in navigator ? 'webgpu' : 'wasm';
}

/** Splits a [n, EG2_DIM] tensor into n normalised Float32Array rows. */
function toUnitRows(tensor: TensorLike, expectedRows: number): Float32Array[] {
  const [rows, dim] = [tensor.dims[0], tensor.dims[tensor.dims.length - 1]];
  if (dim !== EG2_DIM || rows !== expectedRows) {
    throw new Error(
      `EmbeddingGemma2: expected [${expectedRows}, ${EG2_DIM}] output, got [${tensor.dims.join(', ')}]`,
    );
  }
  const out: Float32Array[] = [];
  for (let i = 0; i < rows; i++) {
    const vector = new Float32Array(EG2_DIM);
    let sumSquares = 0;
    for (let j = 0; j < EG2_DIM; j++) {
      const value = Number(tensor.data[i * EG2_DIM + j]);
      vector[j] = value;
      sumSquares += value * value;
    }
    const norm = Math.sqrt(sumSquares) || 1;
    for (let j = 0; j < EG2_DIM; j++) vector[j] /= norm;
    out.push(vector);
  }
  return out;
}

export function createEmbeddingGemma2(
  options: EmbeddingGemma2Options = {},
  deps: EmbeddingGemma2Deps = {},
): EmbeddingGemma2 {
  const importTransformers = deps.importTransformers ?? (() => import('@huggingface/transformers'));
  const modelId = options.modelId ?? EG2_MODEL_ID;
  const device = options.device ?? defaultDevice();
  const dtype = { model: 'q4', audio_encoder: 'q4', ...options.dtype } as const;

  let state: LoadedState | null = null;
  let disposed = false;
  // Serialises loads and calls so a reload never races an in-flight embed.
  let queue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task);
    queue = run.then(noop, noop);
    return run;
  };

  async function ensureLoaded(needAudio: boolean): Promise<LoadedState> {
    if (disposed) throw new Error('EmbeddingGemma2: instance is disposed; create a new one');
    if (state && (state.hasAudio || !needAudio)) return state;

    const t = await importTransformers();
    let processor: LoadedState['processor'] | null = state?.processor ?? null;
    if (state) {
      // Text-only model is replaced by the full one; free the old sessions first.
      await state.model.dispose();
      state = null;
    }

    // Drop the vision encoder always; drop the audio encoder unless audio is requested.
    const config = await t.AutoConfig.from_pretrained(modelId);
    const editable = config as unknown as { vision_config: unknown; audio_config: unknown };
    editable.vision_config = null;
    if (!needAudio) editable.audio_config = null;

    const model = await t.AutoModel.from_pretrained(modelId, {
      config,
      device,
      dtype,
      progress_callback: options.onProgress,
    } as Parameters<typeof t.AutoModel.from_pretrained>[1]);
    if (!processor) {
      processor = (await t.AutoProcessor.from_pretrained(modelId)) as unknown as LoadedState['processor'];
    }

    state = {
      model: model as unknown as LoadedState['model'],
      processor,
      hasAudio: needAudio,
    };
    return state;
  }

  return {
    embedText(texts, { prefix = '' } = {}) {
      return enqueue(async () => {
        if (texts.length === 0) return [];
        const s = await ensureLoaded(false);
        const inputs = await s.processor(texts.map((text) => prefix + text));
        const { sentence_embedding } = await s.model(inputs);
        return toUnitRows(sentence_embedding, texts.length);
      });
    },

    embedAudio(samples) {
      if (!(samples instanceof Float32Array)) {
        return Promise.reject(new TypeError('EmbeddingGemma2: embedAudio expects a Float32Array'));
      }
      if (samples.length === 0) {
        return Promise.reject(new RangeError('EmbeddingGemma2: audio is empty'));
      }
      const maxSamples = EG2_MAX_AUDIO_SECONDS * EG2_AUDIO_SAMPLE_RATE;
      if (samples.length > maxSamples) {
        return Promise.reject(
          new RangeError(`EmbeddingGemma2: audio is ${(samples.length / EG2_AUDIO_SAMPLE_RATE).toFixed(1)} s; max is ${EG2_MAX_AUDIO_SECONDS} s`),
        );
      }
      return enqueue(async () => {
        const s = await ensureLoaded(true);
        const inputs = await s.processor(null, null, samples);
        const { sentence_embedding } = await s.model(inputs);
        return toUnitRows(sentence_embedding, 1)[0];
      });
    },

    dispose() {
      return enqueue(async () => {
        disposed = true;
        if (state) {
          const old = state;
          state = null;
          await old.model.dispose();
        }
      });
    },
  };
}
