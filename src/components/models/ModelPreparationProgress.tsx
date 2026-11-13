'use client';

/** Live speech-model preparation progress, shared by every surface that shows it.
 *
 * There were three of these and they disagreed, which is most of why the
 * original report was so hard to act on: the recording banner showed a
 * percentage, the consent dialog showed nothing once its download finished,
 * and Settings › Speech model showed "Ready" from the registry while the
 * engine was in fact parked on its first initialization stage. The one fact
 * they were each rendering differently — how far along "getting the model
 * ready" actually is — comes from `getBrowserASRProgress()` (see
 * `src/lib/meeting/browser-asr.ts`), so all of them now derive from it and
 * cannot drift.
 *
 * Note the deliberate asymmetry, which is the whole point: the *download* half
 * of the bar is recomputed from the registry (the entries re-render this on
 * every byte that lands), while the *initialization* half comes from the engine
 * (ORT reports nothing, so the only real signals are completed stages — see
 * `model-progress.ts`). Neither is ever interpolated from elapsed time.
 */

import { useMemo, useSyncExternalStore } from 'react';
import { Text } from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { useT } from '@/lib/i18n/useT';
import {
  getServerBrowserASRProgress,
  getBrowserASRProgress,
  subscribeBrowserASR,
  type BrowserASRProgress,
} from '@/lib/meeting/browser-asr';
import {
  getState as getModelRegistryState,
  getServerSnapshot as getModelRegistryServerSnapshot,
  subscribeRegistry,
} from '@/lib/asr/browser';
import { asrModelEntry } from '@/components/meeting/modelEntries';
import type { ModelEntry } from '@/lib/asr/browser';

/** What every model-progress surface needs, from one place. */
export interface ModelPreparationState {
  /** The ASR entry (the one that gates recording) — see `asrModelEntry`. */
  asrEntry: ModelEntry | undefined;
  /** Bytes/percent of the *download* half, `null` when not measurable. */
  downloadPercent: number | null;
  /** Bytes downloaded so far and the total, for the "1.2 GiB of 2.4 GiB" line. */
  downloadLoadedBytes: number;
  downloadTotalBytes: number;
  /** The engine's own preparation progress — the initialization half. */
  engine: BrowserASRProgress;
  /** The live snapshot, so a caller can memoise on it. */
  snapshot: { registry: unknown; engine: BrowserASRProgress };
}

/**
 * Subscribe to both halves of model preparation.
 *
 * Two `useSyncExternalStore` calls rather than one combined store, because
 * they update at genuinely different rates — the registry re-renders per
 * downloaded chunk, the engine per completed stage (or per ~1% of the
 * fallback re-fetch) — and merging them would mean re-rendering the settings
 * panel on every byte of a download it does not display.
 */
export function useModelPreparation(): ModelPreparationState {
  const registry = useSyncExternalStore(
    subscribeRegistry,
    getModelRegistryState,
    getModelRegistryServerSnapshot,
  );
  const engine = useSyncExternalStore(
    subscribeBrowserASR,
    getBrowserASRProgress,
    getServerBrowserASRProgress,
  );

  return useMemo(() => {
    const asrEntry = asrModelEntry(Object.values(registry.entries));
    const progress = asrEntry?.status === 'downloading' ? asrEntry.progress : null;
    return {
      asrEntry,
      // Deliberately the registry's own byte ratio, not the engine's: the
      // entries are what change on every chunk that lands.
      downloadPercent: downloadPercentOf(progress),
      downloadLoadedBytes: progress?.loadedBytes ?? 0,
      downloadTotalBytes: progress?.totalBytes ?? 0,
      engine,
      snapshot: { registry, engine },
    };
  }, [registry, engine]);
}

function downloadPercentOf(progress: ModelEntry['progress'] | null): number | null {
  if (!progress) return null;
  if (progress.resuming) return null;
  if (!Number.isFinite(progress.totalBytes) || progress.totalBytes <= 0) return null;
  return Math.max(0, Math.min(99, Math.round((progress.loadedBytes / progress.totalBytes) * 100)));
}

/* ------------------------------------------------------------------ */
/* The progress line                                                    */
/* ------------------------------------------------------------------ */

/**
 * The stage name and sub-stage detail, as plain text — "Downloading model
 * 42%", "Setting up model 35%".
 *
 * `null` when the model is not preparing, so a caller can decide for itself
 * whether "nothing to show" means "idle" or "worth an empty state".
 */
export function describePreparation(state: ModelPreparationState): string | null {
  const { engine } = state;
  if (engine.phase === 'ready') return null;
  if (engine.phase === 'downloading') {
    return `status.preparing${state.downloadPercent === null ? '' : ` ${state.downloadPercent}%`}`;
  }
  if (engine.phase === 'loading') {
    return `status.preparing${engine.percent === null ? '' : ` ${engine.percent}%`}`;
  }
  return null;
}

/** The engine's sub-stage detail (e.g. which file is being fetched), for its own quiet line. */
export function describePreparationDetail(state: ModelPreparationState): string | null {
  const { engine } = state;
  return engine.phase === 'loading' && engine.detail ? engine.detail : null;
}

/**
 * `entry.error` carries the full technical message (e.g. `"Download failed: Failed
 * to download encoder-model.onnx: 404 Not Found"`). Pull the filename and HTTP
 * status out and give a short, readable line, with the filename shown beside it.
 */
export function parseDownloadError(raw: string | null): { summary: string; filename: string | null } {
  if (!raw) return { summary: 'error.download', filename: null };

  const match = raw.match(/Failed to download ([^:]+):\s*(\d{3})/);
  if (!match) return { summary: raw, filename: null };

  const [, filename, status] = match;
  const reason = status === '404' ? 'error.downloadNotFound' : `error.downloadServer:${status}`;
  return { summary: `error.downloadSummary:${reason}`, filename };
}

/** True while the model is being prepared, whether or not it can be measured. */
export function isPreparing(state: ModelPreparationState): boolean {
  return state.engine.stage !== null;
}

/** The bar + line, shared verbatim by the consent dialog and Settings. */
export function ModelPreparationBar({ state }: { state: ModelPreparationState }) {
  const t = useT('models');
  const labelKey = describePreparation(state);
  if (labelKey === null) return null;
  const label = labelKey.startsWith('status.preparing')
    ? `${t('status.preparing')}${labelKey.slice('status.preparing'.length)}`
    : labelKey;
  const percent = state.engine.stage === 'downloading' ? state.downloadPercent : state.engine.percent;

  const detail = describePreparationDetail(state);

  return (
    <div className="flex w-full flex-col gap-1">
      <ProgressTrack value={percent} label={label} />
      <Text size="xs" variant="muted" font="mono" className="tabular-nums">
        {label}
      </Text>
      {detail && (
        <Text size="xs" variant="subtle" className="break-words">
          {detail}
        </Text>
      )}
    </div>
  );
}

export function translatedDownloadError(raw: string | null, t: (key: string) => string) {
  const { summary, filename } = parseDownloadError(raw);
  const reason = summary.includes(':') ? summary.slice(summary.lastIndexOf(':') + 1) : null;
  if (summary === 'error.download') return { summary: t(summary), filename };
  if (reason?.startsWith('error.downloadServer:')) {
    const status = reason.slice('error.downloadServer:'.length);
    return { summary: t('error.downloadSummary').replace('{reason}', t('error.downloadServer').replace('{status}', status)), filename };
  }
  return { summary: t('error.downloadSummary').replace('{reason}', t(reason ?? 'error.downloadNotFound')), filename };
}
