import type * as TransformersModule from '@huggingface/transformers';

export type EG2DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
export type EG2Device = 'webgpu' | 'wasm' | 'cpu';

export interface EmbeddingGemma2Options {
  device?: EG2Device;
  dtype?: Partial<{ model: EG2DType; audio_encoder: EG2DType }>;
  onProgress?: (info: unknown) => void;
  modelId?: string;
}

export interface EmbedTextOptions {
  prefix?: string;
}

export interface EmbeddingGemma2 {
  embedText(texts: string[], options?: EmbedTextOptions): Promise<Float32Array[]>;
  embedAudio(samples: Float32Array): Promise<Float32Array>;
  dispose(): Promise<void>;
}

export interface EmbeddingGemma2Deps {
  importTransformers?: () => Promise<typeof TransformersModule>;
}

export interface TensorLike {
  data: ArrayLike<number>;
  dims: readonly number[];
}

export interface LoadedState {
  model: { dispose(): Promise<unknown>; (inputs: unknown): Promise<{ sentence_embedding: TensorLike }> };
  processor: (...args: unknown[]) => Promise<unknown>;
  hasAudio: boolean;
}

export interface ModelLoader {
  load(needAudio: boolean): Promise<LoadedState>;
  release(): Promise<void>;
}

export interface ModelLoaderConfig {
  modelId: string;
  device: EG2Device;
  dtype: { model: EG2DType; audio_encoder: EG2DType };
  onProgress?: (info: unknown) => void;
  importTransformers: () => Promise<typeof TransformersModule>;
}
