import { downloadHfFileResumable, takeBlobUrlBytes, type DownloadProgress } from './resumable-download';
import {
  LOAD_STALL_MS,
  SESSION_STALL_MS,
  describeSessionStall,
  describeStall,
  startStallWatchdog,
} from './engine-load';
import { NEMOTRON } from './nemotron-constants';
import { NemotronRecognizer } from './nemotron-recognizer';
import { parseNemotronVocab } from './nemotron-vocab';
import { NEMOTRON_GRAPHS } from './nemotron-graphs';
import { bytesOf, createNemotronSessions } from './nemotron-ort';
import type { BrowserASRConfig, BrowserASRLoadProgress, OrtLike } from './types';

async function downloadModelFiles(
  config: BrowserASRConfig,
  urls: Map<string, string>,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<void> {
  const resolveWatchdog = startStallWatchdog(LOAD_STALL_MS, describeStall);
  try {
    await Promise.race([
      (async () => {
        for (const file of config.files) {
          const url = await downloadHfFileResumable(config.modelRepo, file, 'main', {
            onProgress: (p: DownloadProgress) => {
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
            },
            urlOverride: config.fileUrlOverrides?.[file],
          });
          urls.set(file, url);
          resolveWatchdog.noteProgress();
        }
      })(),
      resolveWatchdog.stall,
    ]);
  } finally {
    resolveWatchdog.dispose();
  }
}

export async function createNemotronRecognizer(
  config: BrowserASRConfig,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<NemotronRecognizer> {
  const urls = new Map<string, string>();
  try {
    await downloadModelFiles(config, urls, reportLoadProgress);
    const missing = [...NEMOTRON_GRAPHS.map((g) => `${g}.onnx`), 'vocab.txt'].filter((f) => !urls.has(f));
    if (missing.length > 0) {
      throw new Error(`The model manifest is missing required files (${missing.join(', ')}).`);
    }

    const vocab = parseNemotronVocab(new TextDecoder().decode(await bytesOf(urls.get('vocab.txt') as string)));
    if (vocab.length !== NEMOTRON.vocabSize) {
      throw new Error(`vocab.txt has ${vocab.length} entries, the model expects ${NEMOTRON.vocabSize}.`);
    }

    const sessionWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
    try {
      const sessions = await Promise.race([createNemotronSessions(urls, config), sessionWatchdog.stall]);
      const ort = (await import('onnxruntime-web')) as unknown as OrtLike;
      return new NemotronRecognizer(ort, sessions, vocab);
    } finally {
      sessionWatchdog.dispose();
    }
  } finally {
    for (const url of urls.values()) {
      takeBlobUrlBytes(url);
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  }
}
