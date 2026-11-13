import type { AsrModelManifest } from './types/model-manifest';
import type { BrowserASRConfig } from './types';

export function configFromManifest(manifest: AsrModelManifest, language = 'nl'): BrowserASRConfig {
  return {
    engine: manifest.engine,
    modelRepo: manifest.modelRepo,
    language,
    backend: manifest.backend,
    encoderQuant: manifest.encoderQuant,
    preprocessorBackend: manifest.preprocessorBackend,
    decoderQuant: manifest.decoderQuant,
    asrBackend: manifest.asrBackend,
    files: manifest.files,
    ...(manifest.fileUrlOverrides ? { fileUrlOverrides: manifest.fileUrlOverrides } : {}),
  };
}
