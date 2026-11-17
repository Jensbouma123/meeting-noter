import type { AsrModelManifest } from './model-manifest';

export type ManifestFiles = Pick<AsrModelManifest, 'modelRepo' | 'files'> &
  Partial<Pick<AsrModelManifest, 'fileUrlOverrides'>>;
