import type { ManifestFileRole } from '../types/download-manifest-role';

export function categorizeManifestFile(filename: string): ManifestFileRole {
  if (filename === 'vocab.txt' || filename === 'tokens.txt') return 'tokenizer';
  const nemotron = /^(encoder|decoder|joint)\.onnx(\.data)?$/.exec(filename);
  if (nemotron) {
    const role = nemotron[1] === 'encoder' ? 'encoder' : nemotron[1] === 'decoder' ? 'decoder' : 'joint';
    return nemotron[2] ? `${role}Data` : role;
  }
  if (/^nemo\d+\.onnx$/.test(filename)) return 'preprocessor';
  if (filename.startsWith('encoder-model')) {
    return filename.endsWith('.data') ? 'encoderData' : 'encoder';
  }
  if (filename.startsWith('decoder_joint-model') || filename.startsWith('decoder-model')) {
    return filename.endsWith('.data') ? 'decoderData' : 'decoder';
  }
  return 'unknown';
}
