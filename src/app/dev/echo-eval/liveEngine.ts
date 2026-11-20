import { detectAsrBackend, getModelStatus, isConsentGiven, retryDownload } from '@/lib/asr/browser';
import { DIARIZATION_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';
import { registerModelsOnce } from '@/components/models/registerModelsOnce';
import { ensureBrowserASRReady } from '@/lib/meeting';
import { PARQUET_REGISTRY_KEY } from '@/lib/meeting/asr/constants';
import { flushLiveAudio } from '@/lib/meeting/asr/live-flush';
import { pushLiveAudio } from '@/lib/meeting/asr/live-push';
import { asrState } from '@/lib/meeting/asr/state';
import { resetSession } from '@/lib/meeting/session-reset';
import { installOverlapSeparator } from '@/lib/meeting/overlap-separation-flag';
import { getState } from '@/lib/meeting/store-core';
import { acceptEvalModels } from './acceptEvalModels';
import { withBrowserSpeakers } from './browserSpeakers';
import type { EvalEngine } from './types';

const MAX_FALLBACKS = 3;

async function loadAsr(autoConfirm: boolean): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    acceptEvalModels([PARQUET_REGISTRY_KEY]);
    if (await ensureBrowserASRReady()) return;
    if (!autoConfirm || attempt >= MAX_FALLBACKS || isConsentGiven(PARQUET_REGISTRY_KEY)) {
      throw new Error(asrState.blockedReason ?? asrState.error ?? 'speech model failed to load');
    }
  }
}

async function loadDiarizer(): Promise<void> {
  acceptEvalModels([DIARIZATION_REGISTRY_KEY]);
  if (getModelStatus(DIARIZATION_REGISTRY_KEY)?.status !== 'cached') await retryDownload(DIARIZATION_REGISTRY_KEY);
}

async function loadSeparator(separate: boolean): Promise<void> {
  const client = installOverlapSeparator(separate);
  if (client) console.info(`[echo-eval] separator backend: ${await client.warm()}`);
}

const logBackend = (backend: string) => console.info(`[echo-eval] diarizer backend: ${backend}`);

export async function createLiveEngine(meetings = false, autoConfirm = false, separate = false): Promise<EvalEngine> {
  const backend = await detectAsrBackend();
  const asr = { pushLiveAudio, flushLiveAudio };
  return {
    backend,
    ensureReady: async () => {
      await registerModelsOnce();
      await loadAsr(autoConfirm);
      if (meetings) await loadDiarizer();
      await loadSeparator(separate);
    },
    asr: meetings ? withBrowserSpeakers(asr, logBackend) : asr,
    store: { resetSession, getState },
  };
}
