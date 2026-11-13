import { describe, expect, it } from 'vitest';
import { encoderQuantForFile, variantForEncoderFile } from './chain';

describe('variantForEncoderFile', () => {
  it('names the variant after the encoder file that was actually loaded', () => {
    expect(variantForEncoderFile('webgpu', 'encoder-model.q4f16.onnx')).toBe('webgpu-q4f16');
    expect(variantForEncoderFile('webgpu', 'encoder-model.fp16.onnx')).toBe('webgpu-fp16');
    expect(variantForEncoderFile('wasm', 'encoder-model.int8.onnx')).toBe('wasm-int8');
  });

  it('agrees with the manifest for every rung the app can load', () => {
    expect(variantForEncoderFile('webgpu', 'encoder-model.q4f16.onnx')).not.toBe(
      variantForEncoderFile('webgpu', 'encoder-model.fp16.onnx'),
    );
    expect(variantForEncoderFile('wasm', 'encoder-model.int8.onnx')).not.toBe(
      variantForEncoderFile('webgpu', 'encoder-model.int8.onnx'),
    );
  });

  it('falls back to the backend alone for a file it cannot read, rather than guessing', () => {
    expect(variantForEncoderFile('webgpu', 'encoder-model.onnx')).toBe('webgpu');
    expect(variantForEncoderFile('webgpu', null)).toBe('webgpu');
    expect(variantForEncoderFile('auto', 'encoder-model.q4f16.onnx')).toBe('auto');
  });
});

describe('encoderQuantForFile', () => {
  it('reads the quantisation off the filename, and only from an encoder graph', () => {
    expect(encoderQuantForFile('encoder-model.q4f16.onnx')).toBe('q4f16');
    expect(encoderQuantForFile('encoder-model.fp16.onnx')).toBe('fp16');
    expect(encoderQuantForFile('encoder-model.int8.onnx')).toBe('int8');
    expect(encoderQuantForFile('decoder_joint-model.int8.onnx')).toBeNull();
    expect(encoderQuantForFile('vocab.txt')).toBeNull();
  });
});
