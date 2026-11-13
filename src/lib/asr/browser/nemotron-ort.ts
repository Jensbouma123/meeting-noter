import type * as Ort from 'onnxruntime-web';
import { takeBlobUrlBytes } from './resumable-download';
import { isSafariBrowser } from './engine-load';
import { NEMOTRON_GRAPHS } from './nemotron-graphs';
import type { BrowserASRConfig, NemotronGraph, NemotronSessions } from './types';

export async function bytesOf(url: string): Promise<Uint8Array> {
  const held = takeBlobUrlBytes(url);
  if (held) return held;
  const res = await fetch(url);
  return new Uint8Array(await res.arrayBuffer());
}

function configureOrt(ort: typeof Ort, config: BrowserASRConfig): void {
  try {
    ort.env.logLevel = 'error';
  } catch {
    void 0;
  }
  if (!ort.env.wasm.wasmPaths) {
    const version = ort.env.versions?.common ?? '1.24.1';
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`;
  }
  const threaded = typeof SharedArrayBuffer !== 'undefined';
  const wanted = config.cpuThreads ?? (isSafariBrowser() ? 1 : Math.min(4, globalThis.navigator?.hardwareConcurrency ?? 4));
  ort.env.wasm.numThreads = threaded ? wanted : 1;
  ort.env.wasm.proxy = false;
}

export async function createNemotronSessions(
  urls: Map<string, string>,
  config: BrowserASRConfig,
): Promise<NemotronSessions> {
  const ort = (await import('onnxruntime-web')) as typeof Ort;
  configureOrt(ort, config);
  const onGpu = config.asrBackend === 'webgpu';
  const sessions: Partial<Record<NemotronGraph, Ort.InferenceSession>> = {};
  for (const graph of NEMOTRON_GRAPHS) {
    const model = await bytesOf(urls.get(`${graph}.onnx`) as string);
    const dataUrl = urls.get(`${graph}.onnx.data`);
    const externalData = dataUrl ? [{ path: `${graph}.onnx.data`, data: await bytesOf(dataUrl) }] : undefined;
    sessions[graph] = await ort.InferenceSession.create(model, {
      executionProviders: graph === 'encoder' && onGpu ? ['webgpu'] : ['wasm'],
      graphOptimizationLevel: 'all',
      logSeverityLevel: 3,
      ...(externalData ? { externalData } : {}),
    });
  }
  return sessions as unknown as NemotronSessions;
}
