import type { InferenceSession } from 'onnxruntime-web';

export interface SeparatorModelFile {
  repo: string;
  filename: string;
  revision: string;
  sizeBytes: number;
}

export interface LoadedSeparator {
  session: InferenceSession | null;
  backend: 'webgpu' | 'wasm';
}
