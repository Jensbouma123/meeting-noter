import type { InferenceSession } from 'onnxruntime-web';

export interface SeparatorModelFile {
  repo: string;
  filename: string;
  revision: string;
  sizeBytes: number;
  url: string;
}

export interface LoadedSeparator {
  session: InferenceSession | null;
  backend: 'webgpu' | 'wasm';
}
