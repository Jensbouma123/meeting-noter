import type { ParakeetModel } from 'parakeet.js';
import { probeCachedModelFiles } from './resumable-download';
import { createParakeetModel } from './parakeet-model-factory';
import { canHookParakeet, hookParakeetVocabulary } from './vocabulary-hook';
import { SESSION_STALL_MS, describeSessionStall, startStallWatchdog } from './engine-load';
import type { BiaserSlot } from '@/lib/vocabulary/biaser-slot';
import type { BrowserASRConfig, BrowserASRLoadProgress, HookableParakeetModel } from './types';

export const WARMUP_SAMPLE_RATE = 16000;

async function readModelFiles(
  config: BrowserASRConfig,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<void> {
  const files = config.files;
  if (files.length === 0) return;
  reportLoadProgress({ stage: 'files', done: 0, total: files.length });
  await probeCachedModelFiles(
    { modelRepo: config.modelRepo, files },
    ({ done, total }) => reportLoadProgress({ stage: 'files', done, total }),
  );
}

async function warmUp(
  model: ParakeetModel,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
): Promise<void> {
  try {
    await model.transcribe(new Float32Array(WARMUP_SAMPLE_RATE), WARMUP_SAMPLE_RATE, {
      enableProfiling: false,
    });
    model.resetMelCache();
  } catch (err) {
    console.warn('[asr] Model warm-up did not complete; continuing without it', err);
    return;
  }
  reportLoadProgress({ stage: 'warmup', done: 1, total: 1 });
}

export async function loadParakeetModel(
  config: BrowserASRConfig,
  vocabulary: BiaserSlot,
  reportLoadProgress: (progress: BrowserASRLoadProgress) => void,
  onModelCreated: (model: ParakeetModel) => void,
): Promise<void> {
  await readModelFiles(config, reportLoadProgress);
  const model = await createParakeetModel(config, reportLoadProgress);
  reportLoadProgress({ stage: 'session', done: 1, total: 1 });
  onModelCreated(model);
  const hookable = model as unknown as Partial<HookableParakeetModel>;
  if (canHookParakeet(hookable)) {
    hookParakeetVocabulary(hookable, () => vocabulary.get());
    vocabulary.setVocab(hookable.tokenizer.id2token);
  } else {
    console.warn('[asr] This parakeet.js has no decoder step to hook; the word list only fixes spelling afterwards');
  }
  const warmupWatchdog = startStallWatchdog(SESSION_STALL_MS, describeSessionStall);
  try {
    await Promise.race([warmUp(model, reportLoadProgress), warmupWatchdog.stall]);
  } finally {
    warmupWatchdog.dispose();
  }
}
