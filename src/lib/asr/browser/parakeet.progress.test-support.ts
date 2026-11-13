import { vi } from 'vitest';
import type { BrowserASRLoadProgress, BrowserASREvents } from './types';

export const loadState = {
  hold: false,
  hangCreate: false,
  failWarmUp: false,
  failCreate: false,
  holdTranscribe: false,
  transcribeCalls: [] as number[],
  melResets: 0,
  revoked: [] as string[],
  createdFrom: [] as string[],
  files: 'cached' as 'cached' | 'bytes' | 'hang',
  probe: [] as string[],
  reported: [] as Array<{ loaded: number; total: number; file: string }>,
  served: 0,
};

export const parakeetJsMock = () => ({
  ParakeetModel: {
    fromUrls: async (cfg: { encoderUrl: string; decoderUrl: string }) => {
      if (loadState.hangCreate) {
        return new Promise(() => {});
      }
      while (loadState.hold) {
        await new Promise((r) => setTimeout(r, 1));
      }
      loadState.createdFrom.push(cfg.encoderUrl, cfg.decoderUrl);
      if (loadState.failCreate) throw new Error('session creation exploded');
      return {
        transcribe: async (audio: Float32Array) => {
          loadState.transcribeCalls.push(audio.length);
          while (loadState.holdTranscribe) {
            await new Promise((r) => setTimeout(r, 1));
          }
          if (loadState.failWarmUp) throw new Error('warm-up is not supported by this config');
          return { utterance_text: '', words: [], is_final: true, metrics: null };
        },
        resetMelCache: () => {
          loadState.melResets += 1;
        },
      };
    },
  },
}
);

export const resumableDownloadMock = async () => {
  const actual = await vi.importActual<typeof import('./resumable-download')>('./resumable-download');
  return {
    ...actual,
    probeCachedModelFiles: async (
      manifest: { files: readonly string[] },
      onProgress?: (probe: { done: number; total: number; file: string; cached: boolean }) => void,
    ) => {
      for (const [index, file] of manifest.files.entries()) {
        loadState.probe.push(file);
        onProgress?.({ done: index + 1, total: manifest.files.length, file, cached: true });
      }
    },
    downloadHfFileResumable: async (
      _repo: string,
      file: string,
      _revision: string,
      options?: { onProgress?: (p: { loaded: number; total: number; file: string }) => void },
    ) => {

      if (loadState.served === 0) {
        loadState.served += 1;
        if (loadState.files === 'hang') {

          return new Promise(() => {});
        }
        if (loadState.files === 'bytes') {

          for (const loaded of [400, 900]) {
            const event = { loaded, total: 900, file };
            loadState.reported.push(event);
            options?.onProgress?.(event);
            await new Promise((r) => setTimeout(r, 1));
          }
        }
      }
      return `blob:fake/${file}`;
    },
  };
};

export const WASM = {
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  language: 'nl',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  asrBackend: 'wasm',
  files: ['encoder-model.int8.onnx', 'decoder_joint-model.int8.onnx', 'vocab.txt'],
} as const;

export function recorder() {
  const progress: BrowserASRLoadProgress[] = [];
  const events: BrowserASREvents = {
    onSegment: () => {},
    onLanguage: () => {},
    onStatusChange: () => {},
    onError: () => {},
    onLoadProgress: (p) => progress.push(p),
  };
  return { progress, events };
}

export function resetLoadState(): ReturnType<typeof vi.fn> {
  loadState.hold = false;
  loadState.hangCreate = false;
  loadState.failWarmUp = false;
  loadState.failCreate = false;
  loadState.holdTranscribe = false;
  loadState.transcribeCalls.length = 0;
  loadState.melResets = 0;
  loadState.revoked.length = 0;
  loadState.createdFrom.length = 0;
  loadState.files = 'cached';
  loadState.probe.length = 0;
  loadState.reported.length = 0;
  loadState.served = 0;
  const revokeObjectURL = vi.fn((url: string) => loadState.revoked.push(url));
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  return revokeObjectURL;
}
