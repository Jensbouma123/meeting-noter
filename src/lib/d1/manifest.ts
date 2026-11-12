/**
 * LiquidAI D1 (`d1-omni-600M-ONNX`) text-only model manifest.
 *
 * Text-only zero-token classification uses the 8-bit `model_quantized.onnx`
 * graph + external data weights (~392 MB / ~387.5 MiB total) on WASM, or the 4-bit
 * `model_q4.onnx` (~233 MiB) on WebGPU, along with `config.json`,
 * `tokenizer.json`, and `tokenizer_config.json`. `D1_TEXT_FILES` / `D1_TOTAL_SIZE_BYTES`
 * describe the 8-bit set, which is the one the consent/download flow fetches.
 */

export interface D1ModelFile {
  repo: string;
  filename: string;
  sizeBytes: number;
}

export const D1_OMNI_REPO = 'onnx-community/d1-omni-600M-ONNX';
export const D1_OMNI_REVISION = 'main';

export const D1_CONFIG_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'config.json',
  sizeBytes: 2_433,
});

export const D1_TOKENIZER_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'tokenizer.json',
  sizeBytes: 4_733_371,
});

export const D1_TOKENIZER_CONFIG_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'tokenizer_config.json',
  sizeBytes: 259,
});

export const D1_GRAPH_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'onnx/model_quantized.onnx',
  sizeBytes: 445_782,
});

export const D1_WEIGHTS_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'onnx/model_quantized.onnx_data',
  sizeBytes: 405_883_392,
});

/**
 * 4-bit variant (`model_q4`, MatMulNBits weights, ~233 MiB vs ~387 MiB for 8-bit).
 * The WebGPU execution provider cannot run the 8-bit graph (it rejects it with
 * "Only 4b quantization is supported for MatMulNBits"), so WebGPU loads this one
 * and the WASM CPU provider keeps the 8-bit `model_quantized` graph.
 */
export const D1_GRAPH_Q4_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'onnx/model_q4.onnx',
  sizeBytes: 443_338,
});

export const D1_WEIGHTS_Q4_FILE: D1ModelFile = Object.freeze({
  repo: D1_OMNI_REPO,
  filename: 'onnx/model_q4.onnx_data',
  sizeBytes: 244_221_440,
});

export type D1ModelVariant = 'int8' | 'q4';

/** Config + tokenizer files, shared by both variants. */
export const D1_SHARED_FILES: readonly D1ModelFile[] = Object.freeze([
  D1_CONFIG_FILE,
  D1_TOKENIZER_FILE,
  D1_TOKENIZER_CONFIG_FILE,
]);

/** Graph + external weights of one variant. */
export function d1VariantModelFiles(variant: D1ModelVariant): { graph: D1ModelFile; weights: D1ModelFile } {
  return variant === 'q4'
    ? { graph: D1_GRAPH_Q4_FILE, weights: D1_WEIGHTS_Q4_FILE }
    : { graph: D1_GRAPH_FILE, weights: D1_WEIGHTS_FILE };
}

/** Every file one variant needs: shared files, graph, weights. */
export function d1VariantFiles(variant: D1ModelVariant): readonly D1ModelFile[] {
  const { graph, weights } = d1VariantModelFiles(variant);
  return [...D1_SHARED_FILES, graph, weights];
}

export const D1_TEXT_FILES: readonly D1ModelFile[] = Object.freeze([
  D1_CONFIG_FILE,
  D1_TOKENIZER_FILE,
  D1_TOKENIZER_CONFIG_FILE,
  D1_GRAPH_FILE,
  D1_WEIGHTS_FILE,
]);

export const D1_TOTAL_SIZE_BYTES = D1_TEXT_FILES.reduce((sum, file) => sum + file.sizeBytes, 0);

/** External data filename as recorded inside the graph (`model_quantized.onnx` / `model_q4.onnx`). */
export function externalDataPath(file: D1ModelFile): string {
  return file.filename.slice(file.filename.lastIndexOf('/') + 1);
}

/** OOM bounds: cap batch size and sequence tokens per forward pass. */
export const D1_MAX_BATCH_SIZE = 4;
export const D1_MAX_TOKENS = 1024;

/** Calibrated fallback temperatures when `config.json` lacks a bucket. */
export const D1_DEFAULT_TEMPERATURES: Readonly<Record<string, number>> = Object.freeze({
  'noul:2': 1.6663,
  'choice:2': 1.7465,
  'choice:3-5': 1.3999,
  'choice:6-10': 1.1751,
  'choice:11+': 1.3725,
  'score:3-5': 1.7301,
  'score:6-10': 1.0,
  choice: 1.0,
  score: 1.0,
  noul: 1.0,
});

export const D1_DELIMITERS = Object.freeze({
  state: '<|reserved_7|>',
  q: '<|reserved_8|>',
  opt: '<|reserved_9|>',
  opt_end: '<|reserved_10|>',
  decide: '<|reserved_11|>',
});

export const D1_MARKER_TOKEN = '<|mask|>';

export const D1_QTYPES = Object.freeze({
  choice: 0,
  score: 1,
  noul: 2,
} as const);
