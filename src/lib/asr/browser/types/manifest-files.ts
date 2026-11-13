import type { AsrModelManifest } from './model-manifest';

export type ManifestFiles = Pick<AsrModelManifest, 'modelRepo' | 'files'>;
