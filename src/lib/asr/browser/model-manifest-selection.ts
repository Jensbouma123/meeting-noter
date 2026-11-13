import type { AsrModelFamily } from './model-family';
import { NEMOTRON_ASR_WASM, NEMOTRON_ASR_WEBGPU } from './model-manifest-nemotron';
import {
  PARAKEET_TDT_V3_WASM,
  PARAKEET_TDT_V3_WEBGPU,
  PARAKEET_TDT_V3_WEBGPU_FP16,
} from './model-manifest-parakeet';
import type { AsrBackend, AsrModelManifest, ManifestRuntimeOptions, WebgpuEncoderQuant } from './types/model-manifest';

function encoderAvailable(envUrl: string | undefined): boolean {
  return (envUrl !== undefined && envUrl !== '') || process.env.NODE_ENV !== 'production';
}

export const WEBGPU_ENCODER_FALLBACKS: readonly WebgpuEncoderQuant[] = Object.freeze(
  (
    [
      ['q4f16', process.env.NEXT_PUBLIC_Q4F16_ENCODER_URL],
      ['fp16', process.env.NEXT_PUBLIC_FP16_ENCODER_URL],
    ] as const
  )
    .filter(([, url]) => encoderAvailable(url))
    .map(([quant]) => quant),
);

export function webgpuEncodersAvailable(): boolean {
  return WEBGPU_ENCODER_FALLBACKS.length > 0;
}

export function webgpuManifestForEncoder(encoder: WebgpuEncoderQuant): AsrModelManifest {
  return encoder === 'fp16' ? PARAKEET_TDT_V3_WEBGPU_FP16 : PARAKEET_TDT_V3_WEBGPU;
}

export function nextWebgpuEncoder(encoder: WebgpuEncoderQuant): WebgpuEncoderQuant | null {
  const next = WEBGPU_ENCODER_FALLBACKS[WEBGPU_ENCODER_FALLBACKS.indexOf(encoder) + 1];
  return next ?? null;
}

export function webgpuEncoderOf(manifest: AsrModelManifest): WebgpuEncoderQuant | null {
  if (manifest.asrBackend !== 'webgpu') return null;
  return manifest.encoderQuant === 'fp16' ? 'fp16' : 'q4f16';
}

export function asrManifestFallbackOrder(): readonly AsrModelManifest[] {
  return Object.freeze([
    ...WEBGPU_ENCODER_FALLBACKS.map(webgpuManifestForEncoder),
    PARAKEET_TDT_V3_WASM,
  ]);
}

export function manifestForBackend(backend: AsrBackend): AsrModelManifest {
  return backend === 'webgpu'
    ? webgpuManifestForEncoder(WEBGPU_ENCODER_FALLBACKS[0] ?? 'q4f16')
    : PARAKEET_TDT_V3_WASM;
}

export function manifestForFamily(family: AsrModelFamily, backend: AsrBackend): AsrModelManifest {
  if (family === 'nemotron') return backend === 'webgpu' ? NEMOTRON_ASR_WEBGPU : NEMOTRON_ASR_WASM;
  return manifestForBackend(backend);
}

function allManifests(): readonly AsrModelManifest[] {
  return [
    PARAKEET_TDT_V3_WEBGPU,
    PARAKEET_TDT_V3_WEBGPU_FP16,
    PARAKEET_TDT_V3_WASM,
    NEMOTRON_ASR_WEBGPU,
    NEMOTRON_ASR_WASM,
  ];
}

export function manifestForVariant(variant: string | undefined): AsrModelManifest | null {
  return allManifests().find((m) => m.variant === variant) ?? null;
}

export function hubOptionsFor(manifest: AsrModelManifest): ManifestRuntimeOptions {
  return {
    backend: manifest.backend,
    encoderQuant: manifest.encoderQuant,
    decoderQuant: manifest.decoderQuant,
    preprocessorBackend: manifest.preprocessorBackend,
  };
}
