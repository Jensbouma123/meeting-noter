/** Language-ID model manifest — Whisper-tiny encoder + decoder (first-token
 *  language logits), quantized ONNX export from `Xenova/whisper-tiny`.
 *
 * Whisper's own `detect_language()` (used by every Whisper client, including
 * openai/whisper and HF `transformers`) forwards the encoder once, then runs
 * the decoder for a single step with only the start-of-transcript token and
 * reads the logits at the 99 language-token positions — no separate
 * classifier head needed. That means the *un-fine-tuned* multilingual Whisper
 * checkpoint is already a language identifier; we just need the encoder +
 * (no-KV-cache) decoder graphs, not the full generation loop.
 *
 * `encoder_model_quantized.onnx` (~10 MB) and `decoder_model_quantized.onnx`
 * (~30 MB) are the smallest pair that doesn't require the merged/with-past
 * decoder variant — LID only ever needs a single decoder step per detection,
 * so there is nothing to cache across steps.
 */
export const LANGID_MODEL_REPO = 'Xenova/whisper-tiny';
export const LANGID_MODEL_REVISION = 'main';

export const LANGID_MODEL_FILES = Object.freeze({
  encoder: 'onnx/encoder_model_quantized.onnx',
  decoder: 'onnx/decoder_model_quantized.onnx',
});

// Measured from the HF tree API (`Xenova/whisper-tiny`, main) — shown to
// callers that want to display an approximate download size before it starts.
export const LANGID_MODEL_FALLBACK_SIZE_BYTES = 10_124_910 + 30_460_101;

/** Whisper feature-extractor constants (`preprocessor_config.json`). */
export const LANGID_SAMPLE_RATE = 16_000;
export const LANGID_N_FFT = 400;
export const LANGID_HOP_LENGTH = 160;
export const LANGID_N_MELS = 80;
/** 30s at 16kHz — the encoder's fixed input length (`nb_max_frames` = 3000). */
export const LANGID_N_SAMPLES = 480_000;
export const LANGID_N_FRAMES = 3_000;

/** `generation_config.json`: `<|startoftranscript|>` — the only decoder input
 *  token needed; its output logits are what `detect_language` reads. */
export const LANGID_DECODER_START_TOKEN = 50_258;
