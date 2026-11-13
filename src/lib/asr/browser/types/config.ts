import type { AsrBackend, AsrModelManifest } from './model-manifest';

export interface BrowserASRConfig {
  engine?: AsrModelManifest['engine'];
  modelRepo: string;
  language: string;
  backend: AsrModelManifest['backend'];
  encoderQuant: AsrModelManifest['encoderQuant'];
  preprocessorBackend: AsrModelManifest['preprocessorBackend'];
  decoderQuant: AsrModelManifest['decoderQuant'];
  asrBackend: AsrBackend;
  files: readonly string[];
  fileUrlOverrides?: Readonly<Record<string, string>>;
  cpuThreads?: number;
}
