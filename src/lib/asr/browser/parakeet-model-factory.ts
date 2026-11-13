import { ParakeetModel } from 'parakeet.js';
import { takeBlobUrlBytes } from './resumable-download';
import { resolveModelFileUrls } from './model-file-urls';
import {
  LOAD_STALL_MS,
  SESSION_STALL_MS,
  describeSessionStall,
  describeStall,
  isSafariBrowser,
  startStallWatchdog,
} from './engine-load';
import type { BrowserASRConfig, BrowserASRLoadProgress, ModelFileUrls } from './types';

export async function createParakeetModel(
  config: BrowserASRConfig,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<ParakeetModel> {
  const resolveWatchdog = startStallWatchdog(LOAD_STALL_MS, describeStall);
  let urls: ModelFileUrls | null = null;
  try {
    try {
      urls = await Promise.race([
        resolveModelFileUrls(config, (p) => {
          resolveWatchdog.noteProgress();
          if (p.loaded > 0) {
            reportLoadProgress({
              stage: 'fetch',
              done: 0,
              total: 0,
              loadedBytes: p.loaded,
              totalBytes: p.total,
              file: p.file,
            });
          }
        }),
        resolveWatchdog.stall,
      ]);
    } finally {
      resolveWatchdog.dispose();
    }

    const sessionWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
    try {
      return await Promise.race([
        ParakeetModel.fromUrls({
          ...urls,
          encoderUrl: (takeBlobUrlBytes(urls.encoderUrl) ?? urls.encoderUrl) as unknown as string,
          decoderUrl: (takeBlobUrlBytes(urls.decoderUrl) ?? urls.decoderUrl) as unknown as string,
          backend: config.backend,
          preprocessorBackend: config.preprocessorBackend,
          ...(config.cpuThreads !== undefined
            ? { cpuThreads: config.cpuThreads }
            : isSafariBrowser()
              ? { cpuThreads: 1 }
              : {}),
        }),
        sessionWatchdog.stall,
      ]);
    } finally {
      sessionWatchdog.dispose();
    }
  } finally {
    for (const url of Object.values(urls ?? {})) {
      if (typeof url === 'string') takeBlobUrlBytes(url);
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
  }
}
