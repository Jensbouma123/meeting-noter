import { probeCachedModelFiles } from './resumable-download';
import { SESSION_STALL_MS, describeSessionStall, startStallWatchdog } from './engine-load';
import { NEMOTRON, nemotronLangId, type NemotronRecognizer } from './nemotron-core';
import { createNemotronRecognizer } from './nemotron-recognizer-factory';
import type { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { BrowserASRConfig, BrowserASRLoadProgress } from './types';

export const NEMOTRON_PROMPT_LANG_ID = nemotronLangId('auto');

async function readModelFiles(
  config: BrowserASRConfig,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<void> {
  const files = config.files;
  if (files.length === 0) return;
  reportLoadProgress({ stage: 'files', done: 0, total: files.length });
  await probeCachedModelFiles({ modelRepo: config.modelRepo, files }, ({ done, total }) =>
    reportLoadProgress({ stage: 'files', done, total }),
  );
}

async function warmUp(
  recognizer: NemotronRecognizer,
  runSerial: <T>(fn: () => Promise<T>) => Promise<T>,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<void> {
  try {
    await runSerial(() =>
      recognizer.recognize(new Float32Array(NEMOTRON.chunkSamples), {
        langId: NEMOTRON_PROMPT_LANG_ID,
        flushChunks: 0,
      }),
    );
  } catch (err) {
    console.warn('[asr] Model warm-up did not complete; continuing without it', err);
    return;
  }
  reportLoadProgress({ stage: 'warmup', done: 1, total: 1 });
}

export async function loadNemotronRecognizer(
  config: BrowserASRConfig,
  vocabulary: BiaserSlot,
  runSerial: <T>(fn: () => Promise<T>) => Promise<T>,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
  onRecognizerCreated: (recognizer: NemotronRecognizer) => void,
): Promise<void> {
  await readModelFiles(config, reportLoadProgress);
  const recognizer = await createNemotronRecognizer(config, reportLoadProgress);
  reportLoadProgress({ stage: 'session', done: 1, total: 1 });
  onRecognizerCreated(recognizer);
  vocabulary.setVocab(recognizer.pieces);
  const warmupWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
  try {
    await Promise.race([warmUp(recognizer, runSerial, reportLoadProgress), warmupWatchdog.stall]);
  } finally {
    warmupWatchdog.dispose();
  }
}
