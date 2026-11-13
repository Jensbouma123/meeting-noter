import type { AsrModelManifest } from './types/model-manifest';

export const FP16_ENCODER_URL =
  process.env.NEXT_PUBLIC_FP16_ENCODER_URL ??
  '/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.fp16.onnx';

export const Q4F16_ENCODER_URL =
  process.env.NEXT_PUBLIC_Q4F16_ENCODER_URL ??
  '/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';

const DECODER_INT8_BYTES = 18_202_004;
const VOCAB_BYTES = 93_939;

export const PARAKEET_TDT_V3_WEBGPU: AsrModelManifest = Object.freeze({
  engine: 'parakeet',
  key: 'parakeet-ttd',
  variant: 'webgpu-q4f16',
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  displayName: 'Parakeet TDT 0.6B v3',
  description:
    'Browser-native speech recognition, run entirely on your device with WebGPU. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'webgpu',
  backend: 'webgpu-hybrid',
  encoderQuant: 'q4f16',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  files: [
    'encoder-model.q4f16.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileUrlOverrides: Object.freeze({
    'encoder-model.q4f16.onnx': Q4F16_ENCODER_URL,
  }),
  fileSizes: Object.freeze({
    'encoder-model.q4f16.onnx': 515_756_810,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 515_756_810 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

export const PARAKEET_TDT_V3_WEBGPU_FP16: AsrModelManifest = Object.freeze({
  ...PARAKEET_TDT_V3_WEBGPU,
  variant: 'webgpu-fp16',
  encoderQuant: 'fp16',
  files: [
    'encoder-model.fp16.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileUrlOverrides: Object.freeze({
    'encoder-model.fp16.onnx': FP16_ENCODER_URL,
  }),
  fileSizes: Object.freeze({
    'encoder-model.fp16.onnx': 1_239_245_959,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 1_239_245_959 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

export const PARAKEET_TDT_V3_WASM: AsrModelManifest = Object.freeze({
  engine: 'parakeet',
  key: 'parakeet-ttd',
  variant: 'wasm-int8',
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  displayName: 'Parakeet TDT 0.6B v3 (CPU)',
  description:
    'Browser-native speech recognition, run entirely on your device’s CPU. Used when your ' +
    'browser cannot run the GPU-accelerated version. It is too slow to transcribe while you ' +
    'talk, so your recording is transcribed after you stop it. Downloaded once and cached in ' +
    'your browser — audio never leaves this machine.',
  asrBackend: 'wasm',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  files: [
    'encoder-model.int8.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileSizes: Object.freeze({
    'encoder-model.int8.onnx': 652_183_999,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 652_183_999 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

export const PARAKEET_TDT_V3 = PARAKEET_TDT_V3_WEBGPU;
