export const ASSET = 'meeting-noter-macos-arm64.tar.gz';
export const MODEL = 'models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';

export const USER_FILES = {
  [MODEL]: 'seed-model',
  'data/meeting-e2e.json': '{"note":"a user file next to app/"}',
  'bin/uv': 'seed-uv',
  'logs/model-build.log': 'seed-log',
};
