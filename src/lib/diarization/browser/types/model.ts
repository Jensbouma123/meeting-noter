export interface DiarizationModelFile {
  repo: string;
  filename: string;
  sizeBytes: number;
}

export interface ExternalDataFile {
  path: string;
  data: Uint8Array | string;
}

export type SessionBackend = 'webgpu' | 'wasm';
