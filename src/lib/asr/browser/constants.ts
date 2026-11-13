import { configFromManifest } from './config-from-manifest';
import { PARAKEET_TDT_V3_WEBGPU } from './model-manifest';
import type { BrowserASRConfig } from './types';

export const DEFAULT_BROWSER_ASR_CONFIG: BrowserASRConfig = configFromManifest(PARAKEET_TDT_V3_WEBGPU);

export const BROWSER_ASR_LANGUAGE_NAMES: Record<string, string> = {
  nl: 'Nederlands',
};
