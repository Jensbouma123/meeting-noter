import * as ort from 'onnxruntime-web';

export async function createSession(model: string | Uint8Array, backend: 'webgpu' | 'wasm'): Promise<ort.InferenceSession> {
  const create = ort.InferenceSession.create as (m: string | Uint8Array, o: ort.InferenceSession.SessionOptions) => Promise<ort.InferenceSession>;
  return create(model, {
    executionProviders: [backend === 'webgpu' ? 'webgpu' : 'wasm'],
    graphOptimizationLevel: 'all',
    logSeverityLevel: 3,
  });
}

export function revokeBlobUrls(urls: Array<string | null | undefined>): void {
  for (const url of urls) {
    if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}
