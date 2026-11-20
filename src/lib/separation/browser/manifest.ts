import type { SeparatorModelFile } from './types/model';

export const MOSSFORMER2_EINSUM_FREE_REWRITE_URL =
  process.env.NEXT_PUBLIC_MOSSFORMER2_URL ?? '/models/mossformer2-ss-16k/mossformer2_ss_16k.webgpu.onnx';

export const MOSSFORMER2_MODEL: SeparatorModelFile = Object.freeze({
  repo: 'iazShadow/mossformer2-ss-16k-onnx',
  filename: 'mossformer2_ss_16k.webgpu.onnx',
  revision: '291614c7539242b840e9662f18f8b2d551255461',
  sizeBytes: 228_502_602,
  url: MOSSFORMER2_EINSUM_FREE_REWRITE_URL,
});

export const SEPARATOR_INPUT = 'mix';
export const SEPARATOR_OUTPUT = 'sources';
