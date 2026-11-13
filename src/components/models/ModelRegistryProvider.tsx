'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ModelConsentDialog } from './ModelConsentDialog';
import {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  initRegistry,
  registerDefaultModels,
  autoResumeConsentedDownloads,
  detectAsrBackend,
} from '@/lib/asr/browser';
import { registerDiarizationModel } from '@/lib/meeting/diarization-bridge';
import { registerLangIdModel } from '@/lib/meeting/langid-registry';

/* ------------------------------------------------------------------ */
/* ModelRegistryProvider — orchestrates the consent dialog + progress   */
/* chip.  Wrap your meeting view (or page) with this provider.         */
/* ------------------------------------------------------------------ */

interface ModelRegistryProviderProps {
  children: React.ReactNode;
  /** Called when the consent dialog is dismissed (download completed or user chose "Not now"). */
  onDialogDismiss?: () => void;
}

export function ModelRegistryProvider({
  children,
  onDialogDismiss,
}: ModelRegistryProviderProps) {
  // Initialize registry (persisted state) on mount — never during render.
  // If the user already consented and a model isn't fully cached (including
  // one that was mid-download when the page was last closed/refreshed),
  // resume it now without re-showing the consent dialog.
  //
  // The registry entry depends on which backend this device actually uses
  // (WebGPU vs. WASM — see model-manifest.ts): registering before that's
  // known would ask for consent to download the wrong file set. Backend
  // detection is a real (if quick) async adapter probe, so this waits for it
  // before registering.
  useEffect(() => {
    void (async () => {
      const backend = await detectAsrBackend();
      initRegistry();
      registerDefaultModels(backend);
      // Same registry, same consent dialog, same download queue — see
      // diarization-bridge.ts / langid-bridge.ts. Registering them here (not
      // just when a recording starts) is what lets the consent dialog show
      // them, and autoResumeConsentedDownloads() resume them, before Record
      // is ever pressed.
      registerDiarizationModel(backend);
      registerLangIdModel(backend);
      autoResumeConsentedDownloads();
    })();
  }, []);

  // NOTE: this provider deliberately does NOT subscribe to the store or write
  // dialogVisible back into it. Doing so collapsed the computed visibility into
  // a permanent latch, which made "Not now" reopen the dialog forever. The store
  // owns visibility (see shouldShowDialog / openDialog / closeDialog) and the
  // consent dialog reads it to decide whether to render.
  //
  // Model status (progress/failure) lives in the Settings panel's "Speech
  // model" section, not as a floating element here — a bare `<ModelProgressChip
  // />` rendered as a sibling above `{children}` used to render above the
  // page's own header with no layout of its own.

  return (
    <>
      {/* The consent dialog renders via portal to document.body. */}
      <ModelConsentDialog onDismiss={onDialogDismiss} />

      {/* Children (meeting view / page content). */}
      {children}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks — consume registry state from any component                   */
/* ------------------------------------------------------------------ */

/** Hook to check whether a specific model has been downloaded and is cached. */
export function useModelCached(key: string): boolean {
  const state = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot,
  );
  return state.entries[key]?.status === 'cached';
}

/** Hook to get the status of a specific model entry. */
export function useModelStatus(key: string): string | undefined {
  const state = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot,
  );
  return state.entries[key]?.status;
}

/** Hook to check if any model is downloading. */
export function useAnyDownloading(): boolean {
  const state = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot,
  );
  return Object.values(state.entries).some((e) => e.status === 'downloading');
}

/** Hook to check if any model failed to download. */
export function useAnyModelFailed(): boolean {
  const state = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot,
  );
  return Object.values(state.entries).some((e) => e.status === 'failed');
}
