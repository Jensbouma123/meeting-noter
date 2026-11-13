import {
  categorizeManifestFile,
  downloadHfFileResumable,
  type DownloadProgress,
} from './resumable-download';
import type { BrowserASRConfig, ModelFileUrls } from './types';

export async function resolveModelFileUrls(
  config: BrowserASRConfig,
  onProgress?: (p: DownloadProgress) => void,
): Promise<ModelFileUrls> {
  const urls: Partial<ModelFileUrls> & { filenames: { encoder: string; decoder: string } } = {
    filenames: { encoder: '', decoder: '' },
  };
  const unusable: string[] = [];

  for (const file of config.files) {
    const url = await downloadHfFileResumable(config.modelRepo, file, 'main', {
      onProgress,
      urlOverride: config.fileUrlOverrides?.[file],
    });
    switch (categorizeManifestFile(file)) {
      case 'encoder':
        urls.encoderUrl = url;
        urls.filenames.encoder = file;
        break;
      case 'encoderData':
        urls.encoderDataUrl = url;
        break;
      case 'decoder':
        urls.decoderUrl = url;
        urls.filenames.decoder = file;
        break;
      case 'decoderData':
        urls.decoderDataUrl = url;
        break;
      case 'tokenizer':
        urls.tokenizerUrl = url;
        break;
      case 'preprocessor':
        urls.preprocessorUrl = url;
        break;
      case 'joint':
      case 'jointData':
      case 'unknown':
        URL.revokeObjectURL(url);
        unusable.push(file);
        break;
    }
  }

  if (unusable.length > 0) {
    throw new Error(
      `The model manifest lists ${unusable.join(', ')}, which cannot be used to build the model. ` +
        'This is a bug in the manifest, not something to work around.',
    );
  }
  if (!urls.encoderUrl || !urls.decoderUrl || !urls.tokenizerUrl) {
    throw new Error(
      `The model manifest is missing required files (have: ${config.files.join(', ')}).`,
    );
  }
  return urls as ModelFileUrls;
}
