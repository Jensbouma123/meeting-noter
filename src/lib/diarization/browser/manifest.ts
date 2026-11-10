/** Diarization model manifest — the single source of truth for what gets
 *  downloaded, mirroring `src/lib/asr/browser/model-manifest.ts`'s shape.
 *
 * One model: NVIDIA Nemotron-3-Diarization (Streaming Sortformer, 100M
 * params, up to 8 speakers), ONNX export by onnx-community. The graph is a
 * graph file plus an external-data weights file; ONNX Runtime needs both.
 *
 * The q4f16 variant is used on both backends. It is the smallest file set
 * (~73.5 MB), WebGPU runs it natively, and the WASM EP runs it too (it
 * upcasts the fp16 parts), at the same speed as the int8 `model_quantized`
 * (120 MB) or fp32-activation `model_q4` (83 MB) files — measured in
 * `scripts/diarization-der.mjs`, see exchange/nemotron-browser-diarization.md.
 * One variant also means one download, whatever backend the device ends up
 * on, so the consent dialog's size is exact.
 *
 * License: OpenMDW-1.1 (https://openmdw.ai/license/1-1/) — commercial and
 * non-commercial use allowed.
 *
 * Sizes from the HF tree API (2026-09-29):
 *   onnx/model_q4f16.onnx        408,120 bytes
 *   onnx/model_q4f16.onnx_data   73,076,608 bytes
 */

export interface DiarizationModelFile {
  repo: string;
  filename: string;
  sizeBytes: number;
}

export const DIARIZATION_MODEL_REPO = 'onnx-community/Nemotron-3-Diarization-ONNX';

/** The graph. Inputs `input_features` (1, mel frames, 128), `cached_embeds`
 *  (1, cached frames, 512), `attention_mask` int64 (1, cached + chunk encoder
 *  frames). Outputs `logits` (1, (cached + chunk encoder frames) * 8, 8),
 *  `chunk_embeds` (1, chunk encoder frames, 512), `silence_embeds` (512). */
export const SORTFORMER_GRAPH: DiarizationModelFile = Object.freeze({
  repo: DIARIZATION_MODEL_REPO,
  filename: 'onnx/model_q4f16.onnx',
  sizeBytes: 408_120,
});

/** The weights. ONNX Runtime looks it up by the basename the graph records. */
export const SORTFORMER_WEIGHTS: DiarizationModelFile = Object.freeze({
  repo: DIARIZATION_MODEL_REPO,
  filename: 'onnx/model_q4f16.onnx_data',
  sizeBytes: 73_076_608,
});

export const DIARIZATION_MODELS: readonly DiarizationModelFile[] = Object.freeze([
  SORTFORMER_GRAPH,
  SORTFORMER_WEIGHTS,
]);

/** Total download size — shown to the user before consent, alongside the
 *  existing ASR model download (see `asr/browser/model-manifest.ts`). */
export const DIARIZATION_TOTAL_SIZE_BYTES = DIARIZATION_MODELS.reduce(
  (sum, f) => sum + f.sizeBytes,
  0,
);

/** The name the graph gives its external data file, which is how
 *  `InferenceSession.create`'s `externalData` option matches bytes to it. */
export function externalDataPath(file: DiarizationModelFile): string {
  return file.filename.slice(file.filename.lastIndexOf('/') + 1);
}

/* ------------------------------------------------------------------ */
/* Model constants — from the repo's config.json / preprocessor_config.json */
/* ------------------------------------------------------------------ */

export const SAMPLE_RATE = 16_000;
export const NUM_MEL_BINS = 128;
export const HOP_LENGTH = 160;
export const WIN_LENGTH = 400;
export const N_FFT = 512;
export const PREEMPHASIS = 0.97;
/** Mel frames per encoder frame (feature stacking). One encoder frame = 80 ms. */
export const SUBSAMPLING_FACTOR = 8;
export const HIDDEN_SIZE = 512;
export const NUM_SPEAKERS = 8;
/** Seconds per mel frame, which is also the logits' frame rate. */
export const FRAME_SEC = HOP_LENGTH / SAMPLE_RATE;
