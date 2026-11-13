import { describe, expect, it } from 'vitest';
import { chainPosition, requestedVariant } from './chain';
import { DEFAULT_ENCODER as DEFAULT } from './chainFixtures';

describe('chainPosition', () => {
  it('accepts bare names, §3 variant ids and the WASM one', () => {
    expect(chainPosition('q4f16', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('webgpu-q4f16', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('  Q4F16 ', DEFAULT)).toEqual({ key: 'q4f16', backend: 'webgpu', encoder: null });
    expect(chainPosition('fp16', DEFAULT)).toEqual({ key: 'fp16', backend: 'webgpu', encoder: 'fp16' });
    expect(chainPosition('webgpu-fp16', DEFAULT)).toEqual({ key: 'fp16', backend: 'webgpu', encoder: 'fp16' });
    expect(chainPosition('wasm-int8', DEFAULT)).toEqual({ key: 'int8', backend: 'wasm', encoder: null });
  });

  it('needs no `?encoder=` for the default rung, and names it for every other', () => {
    const atDefault = chainPosition('q4f16', DEFAULT);
    const atOther = chainPosition('fp16', DEFAULT);
    expect(atDefault?.encoder).toBeNull();
    expect(atOther?.encoder).toBe('fp16');
    expect(chainPosition('fp16', 'fp16')?.encoder).toBeNull();
    expect(chainPosition('q4f16', 'fp16')?.encoder).toBe('q4f16');
  });

  it('rejects anything outside the chain instead of guessing a variant', () => {
    expect(chainPosition('fp32', DEFAULT)).toBeNull();
    expect(chainPosition('', DEFAULT)).toBeNull();
  });
});

describe('requestedVariant', () => {
  it('names the variant a failed run was launched as', () => {
    expect(requestedVariant('webgpu', null, DEFAULT)).toBe('webgpu-q4f16');
    expect(requestedVariant('webgpu', 'fp16', DEFAULT)).toBe('webgpu-fp16');
    expect(requestedVariant('webgpu', 'q4f16', DEFAULT)).toBe('webgpu-q4f16');
    expect(requestedVariant('wasm', null, DEFAULT)).toBe('wasm-int8');
    expect(requestedVariant('auto', null, DEFAULT)).toBe('auto');
  });
});
