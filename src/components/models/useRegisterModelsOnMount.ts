'use client';

import { useEffect } from 'react';
import {
  initRegistry,
  registerDefaultModels,
  autoResumeConsentedDownloads,
  detectAsrBackend,
} from '@/lib/asr/browser';
import { registerDiarizationModel } from '@/lib/meeting/diarization-registry';
import { registerLangIdModel } from '@/lib/meeting/langid-registry';

export function useRegisterModelsOnMount() {
  useEffect(() => {
    void (async () => {
      const backend = await detectAsrBackend();
      initRegistry();
      registerDefaultModels(backend);
      registerDiarizationModel(backend);
      registerLangIdModel(backend);
      autoResumeConsentedDownloads();
    })();
  }, []);
}
