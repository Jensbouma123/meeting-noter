import {
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
  type AsrModelManifest,
} from '@/lib/asr/browser';

export function manifestWithEncoder(base: AsrModelManifest, encoder: string | null): AsrModelManifest {
  if (base.asrBackend !== 'webgpu' || encoder === null) return base;
  if (encoder === 'fp16') return PARAKEET_TDT_V3_WEBGPU_FP16;
  if (encoder === 'q4f16') return PARAKEET_TDT_V3_WEBGPU;
  return base;
}
