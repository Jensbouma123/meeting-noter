'use client';

import { useState } from 'react';
import { CURRENT_VERSION } from './update/constants';
import type { UpdateInfo } from './update/types';
import { useUpdate } from './update/useUpdate';
import { bumpPatch, SAMPLE_NOTES, usePreview } from './whats-new/preview';
import type { BannerState } from './UpdateBanner.types';

function sampleInfo(): UpdateInfo {
  return {
    current: CURRENT_VERSION,
    latest: bumpPatch(CURRENT_VERSION),
    available: true,
    name: null,
    notes: SAMPLE_NOTES,
    publishedAt: null,
    pageUrl: '',
    installKind: 'unknown',
    canApply: false,
    applyBlockedReason: null,
    restartAutomatic: false,
  };
}

export function useBannerState(isRecording: boolean): BannerState {
  const update = useUpdate(isRecording);
  const preview = usePreview() === 'update';
  const [previewDismissed, setPreviewDismissed] = useState(false);
  if (preview) return { info: previewDismissed ? null : sampleInfo(), preview, dismiss: () => setPreviewDismissed(true) };
  const info = update.info?.available && update.info.latest && update.dismissedVersion !== update.info.latest ? update.info : null;
  return { info, preview, dismiss: update.dismiss };
}
