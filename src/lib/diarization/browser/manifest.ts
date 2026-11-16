import type { DiarizationModelFile } from './types';

export const DIARIZATION_MODEL_REPO = 'onnx-community/Nemotron-3-Diarization-ONNX';

export const SORTFORMER_GRAPH: DiarizationModelFile = Object.freeze({
  repo: DIARIZATION_MODEL_REPO,
  filename: 'onnx/model_q4f16.onnx',
  sizeBytes: 408_120,
});

export const SORTFORMER_WEIGHTS: DiarizationModelFile = Object.freeze({
  repo: DIARIZATION_MODEL_REPO,
  filename: 'onnx/model_q4f16.onnx_data',
  sizeBytes: 73_076_608,
});

export const DIARIZATION_MODELS: readonly DiarizationModelFile[] = Object.freeze([
  SORTFORMER_GRAPH,
  SORTFORMER_WEIGHTS,
]);

// fp32 WeSpeaker ResNet34 (VoxCeleb, CC BY 4.0), used to re-score speakers after a meeting.
// sha256 5ef208a9da1453335308a6b6f4e6dfbd7e183a38b604de0a57664f45d257fe94
export const SPEAKER_EMBEDDER: DiarizationModelFile = Object.freeze({
  repo: 'csukuangfj/speaker-embedding-models',
  filename: 'wespeaker_en_voxceleb_resnet34.onnx',
  sizeBytes: 26_534_365,
});

export const DIARIZATION_DOWNLOADS: readonly DiarizationModelFile[] = Object.freeze([
  ...DIARIZATION_MODELS,
  SPEAKER_EMBEDDER,
]);

export const DIARIZATION_TOTAL_SIZE_BYTES = DIARIZATION_DOWNLOADS.reduce(
  (sum, f) => sum + f.sizeBytes,
  0,
);

export function externalDataPath(file: DiarizationModelFile): string {
  return file.filename.slice(file.filename.lastIndexOf('/') + 1);
}

export const SAMPLE_RATE = 16_000;
export const NUM_MEL_BINS = 128;
export const HOP_LENGTH = 160;
export const WIN_LENGTH = 400;
export const N_FFT = 512;
export const PREEMPHASIS = 0.97;
export const SUBSAMPLING_FACTOR = 8;
export const HIDDEN_SIZE = 512;
export const NUM_SPEAKERS = 8;
export const FRAME_SEC = HOP_LENGTH / SAMPLE_RATE;
