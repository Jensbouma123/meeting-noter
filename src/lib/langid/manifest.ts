export const LANGID_MODEL_REPO = 'Xenova/whisper-tiny';
export const LANGID_MODEL_REVISION = 'main';

export const LANGID_MODEL_FILES = Object.freeze({
  encoder: 'onnx/encoder_model_quantized.onnx',
  decoder: 'onnx/decoder_model_quantized.onnx',
});

export const LANGID_MODEL_FALLBACK_SIZE_BYTES = 10_124_910 + 30_460_101;

export const LANGID_SAMPLE_RATE = 16_000;
export const LANGID_N_FFT = 400;
export const LANGID_HOP_LENGTH = 160;
export const LANGID_N_MELS = 80;
export const LANGID_N_SAMPLES = 480_000;
export const LANGID_N_FRAMES = 3_000;

export const LANGID_DECODER_START_TOKEN = 50_258;
