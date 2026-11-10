/** Whisper-tiny encoder/decoder session management for language ID.
 *
 * Mirrors `parakeet.js`'s own `initOrt()` convention (see
 * `node_modules/parakeet.js/src/backend.js`): default `wasmPaths` to the
 * jsdelivr CDN build matching the installed `onnxruntime-web` version so no
 * separate webpack/static-asset wiring is needed, WebGPU execution provider
 * first, WASM fallback if session creation fails.
 */
import * as ort from 'onnxruntime-web';
// Imported directly from the submodule: `src/lib/asr/browser/index.ts` doesn't
// re-export the resumable downloader (only the higher-level Parakeet download
// manager), and this module owns no files under `src/lib/asr/**` to add that
// export to.
import { downloadHfFileResumable, takeBlobUrlBytes } from '@/lib/asr/browser/resumable-download';
import {
  LANGID_MODEL_REPO,
  LANGID_MODEL_REVISION,
  LANGID_MODEL_FILES,
  LANGID_DECODER_START_TOKEN,
} from './manifest';
import { LANGID_ID_TO_TOKEN } from './languages';

let configured = false;
function ensureOrtConfigured(): void {
  if (configured) return;
  configured = true;
  // Same two benign session-creation warnings ("Unknown CPU vendor",
  // "VerifyEachNodeIsAssignedToAnEp") this app's other ORT users suppress —
  // see `src/lib/diarization/browser/onnx-session.ts` for why they drown out
  // the errors worth reading. Errors still come through.
  try {
    ort.env.logLevel = 'error';
  } catch {
    // Runtime without a settable log level — not worth failing over.
  }
  if (!ort.env.wasm.wasmPaths) {
    const ver = ort.env.versions?.common || '1.24.1';
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ver}/dist/`;
  }
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}

export interface LangIdModel {
  encoder: ort.InferenceSession;
  decoder: ort.InferenceSession;
  backend: 'webgpu' | 'wasm';
}

async function createSession(model: string | Uint8Array, backend: 'webgpu' | 'wasm'): Promise<ort.InferenceSession> {
  // Two overloads, not one signature taking the union.
  const create = ort.InferenceSession.create as (m: string | Uint8Array, o: ort.InferenceSession.SessionOptions) => Promise<ort.InferenceSession>;
  return create(model, {
    executionProviders: [backend === 'webgpu' ? 'webgpu' : 'wasm'],
    graphOptimizationLevel: 'all',
    // Session-scoped, so it wins over `env.logLevel` above regardless of
    // load order — belt and suspenders against the same benign warnings.
    logSeverityLevel: 3,
  });
}

export type DownloadProgressHandler = (loaded: number, total: number, file: string) => void;

/**
 * Drop the `blob:` URLs the model was created from.
 *
 * A live blob URL pins its Blob, so leaving them alive keeps a second full copy
 * of every model file in memory for the rest of the page's life, on top of the
 * copy ORT already made inside the session. Harmless-ish for a 40 MB model,
 * exactly the kind of quiet multiplier that kills a tab which is already
 * holding a 670 MB speech model. `create()` has copied the weights out by the
 * time it resolves, so this is safe in a `finally`.
 */
function revokeBlobUrls(urls: Array<string | null | undefined>): void {
  for (const url of urls) {
    if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
  }
}

/** Download (resumable, cached) both graphs and build ONNX Runtime sessions,
 *  trying WebGPU first and falling back to WASM if session creation fails.
 *
 *  Sessions are created **one at a time**, deliberately. `Promise.all` here
 *  meant both graphs' bytes were resident and both arenas growing at the same
 *  moment — the peak is the sum either way, but the transient double-copy
 *  during graph load is not, and this is an optional feature competing for the
 *  same tab with the speech model. */
export async function loadLangIdModel(onProgress?: DownloadProgressHandler): Promise<LangIdModel> {
  ensureOrtConfigured();

  // Sequential for the same reason the sessions are: two files' worth of bytes
  // in flight at once is peak memory for no gain on a warm cache.
  const encoderUrl = await downloadHfFileResumable(
    LANGID_MODEL_REPO,
    LANGID_MODEL_FILES.encoder,
    LANGID_MODEL_REVISION,
    { onProgress: (p) => onProgress?.(p.loaded, p.total, p.file) },
  );
  const decoderUrl = await downloadHfFileResumable(
    LANGID_MODEL_REPO,
    LANGID_MODEL_FILES.decoder,
    LANGID_MODEL_REVISION,
    { onProgress: (p) => onProgress?.(p.loaded, p.total, p.file) },
  );

  // The bytes behind each URL, taken so the downloader stops pinning them and
  // so ORT reads them directly instead of fetching the blob a second time.
  const encoderModel = takeBlobUrlBytes(encoderUrl) ?? encoderUrl;
  const decoderModel = takeBlobUrlBytes(decoderUrl) ?? decoderUrl;

  try {
    const hasWebGpu = typeof navigator !== 'undefined' && 'gpu' in navigator;
    if (hasWebGpu) {
      let encoder: ort.InferenceSession | undefined;
      try {
        encoder = await createSession(encoderModel, 'webgpu');
        const decoder = await createSession(decoderModel, 'webgpu');
        return { encoder, decoder, backend: 'webgpu' };
      } catch {
        // Fall through to WASM — same reasoning as `backend-detect.ts`: a
        // WebGPU-capable navigator doesn't guarantee a working session. An
        // encoder that did load is released first, or its GPU buffers would
        // outlive the WASM pair that replaces it.
        await encoder?.release().catch(() => {});
      }
    }

    const encoder = await createSession(encoderModel, 'wasm');
    const decoder = await createSession(decoderModel, 'wasm');
    return { encoder, decoder, backend: 'wasm' };
  } finally {
    revokeBlobUrls([encoderUrl, decoderUrl]);
  }
}

export interface LangIdPrediction {
  code: string;
  confidence: number;
}

function findInputName(session: ort.InferenceSession, needle: string): string | undefined {
  return session.inputNames.find((n) => n.toLowerCase().includes(needle));
}

function findOutputName(session: ort.InferenceSession, needle: string): string {
  return session.outputNames.find((n) => n.toLowerCase().includes(needle)) ?? session.outputNames[0];
}

/**
 * Run one language-detection pass: encode the mel features once, then a
 * single decoder step with only `<|startoftranscript|>` as input — this is
 * exactly what Whisper's own `detect_language()` does (see `manifest.ts`),
 * reading the logits at the 99 known language-token ids instead of running
 * full autoregressive decoding.
 */
export async function detectLanguage(model: LangIdModel, melFeatures: Float32Array): Promise<LangIdPrediction[]> {
  const featuresTensor = new ort.Tensor('float32', melFeatures, [1, 80, melFeatures.length / 80]);
  const encoderInputName = model.encoder.inputNames[0];
  const encoderOut = await model.encoder.run({ [encoderInputName]: featuresTensor });
  const encoderOutputName = findOutputName(model.encoder, 'last_hidden_state');
  const encoderHiddenStates = encoderOut[encoderOutputName];

  const decoderFeeds: Record<string, ort.Tensor> = {};
  const inputIdsName = findInputName(model.decoder, 'input_ids');
  const encoderHiddenName = findInputName(model.decoder, 'encoder_hidden_states');
  const attentionMaskName = findInputName(model.decoder, 'attention_mask');
  if (inputIdsName) decoderFeeds[inputIdsName] = new ort.Tensor('int64', [BigInt(LANGID_DECODER_START_TOKEN)], [1, 1]);
  if (encoderHiddenName) decoderFeeds[encoderHiddenName] = encoderHiddenStates;
  if (attentionMaskName) decoderFeeds[attentionMaskName] = new ort.Tensor('int64', [BigInt(1)], [1, 1]);

  const decoderOut = await model.decoder.run(decoderFeeds);
  const logitsName = findOutputName(model.decoder, 'logits');
  const logits = decoderOut[logitsName];
  const vocabSize = logits.dims[logits.dims.length - 1];
  const logitsData = logits.data as Float32Array;

  // Softmax restricted to the known language-token ids only — everything
  // else in the vocabulary (text tokens, other special tokens) is irrelevant
  // to "which language", exactly as Whisper's own `detect_language` masks it.
  const entries: Array<{ code: string; logit: number }> = [];
  for (const [id, code] of LANGID_ID_TO_TOKEN) {
    if (id < vocabSize) entries.push({ code, logit: logitsData[id] });
  }
  const maxLogit = Math.max(...entries.map((e) => e.logit));
  const expSum = entries.reduce((sum, e) => sum + Math.exp(e.logit - maxLogit), 0);
  const predictions = entries
    .map((e) => ({ code: e.code, confidence: Math.exp(e.logit - maxLogit) / expSum }))
    .sort((a, b) => b.confidence - a.confidence);

  return predictions;
}
