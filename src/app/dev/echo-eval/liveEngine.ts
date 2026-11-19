import { detectAsrBackend, recordConsent } from '@/lib/asr/browser';
import { ensureBrowserASRReady } from '@/lib/meeting';
import { PARQUET_REGISTRY_KEY } from '@/lib/meeting/asr/constants';
import { flushLiveAudio } from '@/lib/meeting/asr/live-flush';
import { pushLiveAudio } from '@/lib/meeting/asr/live-push';
import { asrState } from '@/lib/meeting/asr/state';
import { resetSession } from '@/lib/meeting/session-reset';
import { getState } from '@/lib/meeting/store-core';
import type { EvalEngine } from './types';

export async function createLiveEngine(): Promise<EvalEngine> {
  const backend = await detectAsrBackend();
  return {
    backend,
    ensureReady: async () => {
      recordConsent('accepted', [PARQUET_REGISTRY_KEY]);
      if (await ensureBrowserASRReady()) return;
      throw new Error(asrState.blockedReason ?? asrState.error ?? 'speech model failed to load');
    },
    asr: { pushLiveAudio, flushLiveAudio },
    store: { resetSession, getState },
  };
}
