import type { FromHubOptions } from 'parakeet.js';
import type { AsrModelFamily } from '../model-family';

type HubOptions = NonNullable<FromHubOptions>;

export type EncoderQuant = NonNullable<HubOptions['encoderQuant']> | 'q4f16' | 'int4';
export type DecoderQuant = NonNullable<HubOptions['decoderQuant']>;
export type WebgpuEncoderQuant = Extract<EncoderQuant, 'q4f16' | 'fp16'>;
export type AsrBackend = 'webgpu' | 'wasm';

export interface AsrModelManifest {
  engine: AsrModelFamily;
  key: string;
  variant: string;
  modelRepo: string;
  displayName: string;
  description: string;
  asrBackend: AsrBackend;
  backend: NonNullable<HubOptions['backend']>;
  encoderQuant: EncoderQuant;
  decoderQuant: DecoderQuant;
  preprocessorBackend: NonNullable<HubOptions['preprocessorBackend']>;
  files: readonly string[];
  fileUrlOverrides?: Readonly<Record<string, string>>;
  fileSizes: Readonly<Record<string, number>>;
  fallbackSizeBytes: number;
}

export type ManifestRuntimeOptions = Pick<
  AsrModelManifest,
  'backend' | 'encoderQuant' | 'decoderQuant' | 'preprocessorBackend'
>;
