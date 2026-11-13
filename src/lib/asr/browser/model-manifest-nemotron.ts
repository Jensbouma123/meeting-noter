import type { AsrModelManifest } from './types/model-manifest';

const NEMOTRON_FILE_SIZES: Readonly<Record<string, number>> = Object.freeze({
  'encoder.onnx': 2_677_548,
  'encoder.onnx.data': 690_089_984,
  'decoder.onnx': 4_696,
  'decoder.onnx.data': 59_785_216,
  'joint.onnx': 2_136,
  'joint.onnx.data': 37_830_656,
  'vocab.txt': 64_024,
});

export const NEMOTRON_ASR_WEBGPU: AsrModelManifest = Object.freeze({
  engine: 'nemotron',
  key: 'parakeet-ttd',
  variant: 'nemotron-webgpu-int4',
  modelRepo: 'onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4',
  displayName: 'Nemotron 3.5 ASR Streaming 0.6B',
  description:
    'Streaming speech recognition, run entirely on your device with WebGPU. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'webgpu',
  backend: 'webgpu-hybrid',
  encoderQuant: 'int4',
  decoderQuant: 'fp32',
  preprocessorBackend: 'js',
  files: Object.keys(NEMOTRON_FILE_SIZES),
  fileSizes: NEMOTRON_FILE_SIZES,
  fallbackSizeBytes: Object.values(NEMOTRON_FILE_SIZES).reduce((a, b) => a + b, 0),
});

export const NEMOTRON_ASR_WASM: AsrModelManifest = Object.freeze({
  ...NEMOTRON_ASR_WEBGPU,
  variant: 'nemotron-wasm-int4',
  displayName: 'Nemotron 3.5 ASR Streaming 0.6B (CPU)',
  description:
    'Streaming speech recognition, run entirely on your device’s CPU. Used when your browser ' +
    'cannot run the GPU-accelerated version; your recording is transcribed after you stop it. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'wasm',
  backend: 'wasm',
});
