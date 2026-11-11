'use client';

import { useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Cpu, Download, Loader2, Trash2, Zap } from 'lucide-react';
import {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  retryDownload,
  openDialog,
  deleteDownloadedModels,
  formatBytes,
  formatSeconds,
  type DeleteModelCacheResult,
  type ModelEntry,
  type AsrBackend,
} from '@/lib/asr/browser';
import { resetBrowserASR, selectSpeechModel } from '@/lib/meeting/browser-asr';
import {
  getAsrModelFamily,
  getServerAsrModelFamily,
  subscribeAsrModelFamily,
  type AsrModelFamily,
} from '@/lib/asr/browser/model-family';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  HStack,
  Radio,
  RadioGroup,
  Text,
  Tooltip,
  VStack,
} from '@jensbouma123/acciva-ui';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import { useT } from '@/lib/i18n/useT';
import {
  ModelPreparationBar,
  isPreparing,
  parseDownloadError,
  translatedDownloadError,
  useModelPreparation,
  type ModelPreparationState,
} from './ModelPreparationProgress';

/* ------------------------------------------------------------------ */
/* SpeechModelSettings — speech model status + progress + actions.     */
/*                                                                     */
/* No outer card/sheet chrome — just the section content, meant to be   */
/* dropped into whatever settings surface hosts it (see the settings    */
/* dialog rebuild). Replaces the old floating "Model failed" strip:     */
/* status now lives where users already look for app configuration.    */
/* ------------------------------------------------------------------ */

export function SpeechModelSettings() {
  const t = useT('models');
  const { entries } = useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
  const models = Object.values(entries);
  const preparation = useModelPreparation();

  if (models.length === 0) return null;

  return (
    <VStack spacing="sm" className="w-full">
      <Text size="xs" variant="muted">
        {t('privacy.device')}
      </Text>

      {/* The registry only knows about *downloads*, so a model whose bytes are
          on disk but whose session has not been created yet used to read as a
          finished "Ready" here with nothing moving. The engine's own progress
          is the other half of "ready", and this is where it belongs — same
          component, same numbers as the recording banner. */}
      <SpeechModelPicker />

      <ModelPreparationBar state={preparation} />

      <VStack spacing="sm" className="w-full">
        {models.map((entry) => (
          <ModelStatusRow key={entry.key} entry={entry} preparation={preparation} />
        ))}
      </VStack>

      <DeleteDownloadedModels models={models} preparation={preparation} />
    </VStack>
  );
}

/* ------------------------------------------------------------------ */
/* Which speech model                                                   */
/* ------------------------------------------------------------------ */

/** Parakeet or Nemotron. Switching drops the loaded model; the entry below
 *  then describes the chosen family's download. */
function SpeechModelPicker() {
  const t = useT('models');
  const family = useSyncExternalStore(subscribeAsrModelFamily, getAsrModelFamily, getServerAsrModelFamily);
  const [refused, setRefused] = useState(false);
  const choose = (next: AsrModelFamily) => setRefused(!selectSpeechModel(next));
  return (
    <VStack spacing="xs" className="w-full">
      <RadioGroup value={family} onChange={(v) => choose(v as AsrModelFamily)} orientation="vertical">
        <Radio
          value="parakeet"
          label="Parakeet TDT 0.6B v3"
          description={t('model.parakeet.description')}
        />
        <Radio
          value="nemotron"
          label="Nemotron 3.5 ASR Streaming 0.6B"
          description={t('model.nemotron.description')}
        />
      </RadioGroup>
      {refused && (
        <Alert variant="warning" layout="inline">
          {t('model.switchBlocked')}
        </Alert>
      )}
    </VStack>
  );
}

/* ------------------------------------------------------------------ */
/* Delete downloaded models                                             */
/* ------------------------------------------------------------------ */

/**
 * The one action that can recover a cache the app has got wrong about.
 *
 * It exists because the failure it fixes is otherwise unrecoverable from the
 * UI: when the IndexedDB cache cannot be read, the model is not usable, but
 * every visible surface still says "Ready" (the files *were* downloaded at
 * some point), so Record enables and transcribes nothing, with no error to
 * act on. Deleting forces a clean re-download from a state the app agrees
 * with.
 *
 * `deleted: false` is reported rather than swallowed: some other connection
 * (a second tab, or `parakeet.js`'s own) is still holding the cache open, so
 * the files are still on disk and the user needs to know that closing the other
 * tab is what will finish the job.
 */
function DeleteDownloadedModels({
  models,
  preparation,
}: {
  models: ModelEntry[];
  preparation: ModelPreparationState;
}) {
  const t = useT('models');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<DeleteModelCacheResult | null>(null);

  // A download in progress is exactly when this button is needed most — a
  // download stuck at 99% (or a corrupt partial no status will admit to) has
  // no other recovery. Clicking first aborts the in-flight fetch (inside
  // `deleteDownloadedModels`), then deletes, so it is only ever disabled
  // while a delete of its own is running.
  const downloading =
    models.some((e) => e.status === 'downloading') || isPreparing(preparation);
  const anyCached = models.some((entry) => entry.status === 'cached');
  // Partial chunks count as bytes on disk too: a download interrupted after
  // the first chunk leaves resume bookkeeping and bytes behind while no
  // entry reads as `cached`, and "No models are downloaded yet" would be a
  // lie told about megabytes the delete is about to reclaim.
  const anyPartialBytes =
    models.some((entry) => entry.progress.loadedBytes > 0) || preparation.downloadLoadedBytes > 0;

  const deleteModels = () => {
    setConfirmOpen(false);
    setBusy(true);
    setResult(null);
    // Drop the loaded engine first: `parakeet.js` 1.4.4 has no
    // `release()` for its sessions, so `disable()` is the only way the
    // old model's memory goes back — and leaving a live one while its
    // files are deleted is how a Safari tab ends up holding a model
    // that can never load again.
    resetBrowserASR();
    void deleteDownloadedModels()
      .then(setResult)
      .catch(() => setResult({ deleted: false }))
      .finally(() => setBusy(false));
  };

  return (
    <VStack spacing="xs" className="w-full">
      <HStack spacing="sm" justify="between" align="center" wrap>
        <Text size="xs" variant="muted">
          {anyCached
            ? t('privacy.cached')
            : anyPartialBytes
              ? t('privacy.partial')
              : t('privacy.empty')}
        </Text>
        <Button
          variant="secondary"
          size={{ base: 'md', md: 'sm' }}
          leadingIcon={<Trash2 className="size-3.5" />}
          disabled={busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? t('action.deleting') : downloading ? t('action.cancelDelete') : t('action.delete')}
        </Button>
      </HStack>

      {result && (
        <Alert variant={result.deleted ? 'success' : 'danger'} layout="inline">
          {result.deleted
            ? t('delete.success')
            : t('delete.conflict')}
        </Alert>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteModels}
        title={t('delete.title')}
        description={t('delete.body')}
        confirmText={t('delete.confirm')}
        variant="danger"
      />
    </VStack>
  );
}

function ModelStatusRow({
  entry,
  preparation,
}: {
  entry: ModelEntry;
  preparation: ModelPreparationState;
}) {
  const t = useT('models');
  const preparing = isPreparing(preparation) && (entry.kind ?? 'asr') === 'asr';
  return (
    <Card variant="bordered" padding="md" className="w-full">
    <VStack spacing="sm" className="w-full">
      <HStack spacing="sm" justify="between" align="center" wrap>
        <HStack spacing="sm" className="min-w-0">
          <StatusIcon status={entry.status} preparing={preparing} />
          <Text weight="semibold" size="sm" truncate>
            {entry.displayName}
          </Text>
        </HStack>
        <HStack spacing="xs" className="shrink-0">
          {/* Diarization picks its own backend per source, independently of
              the ASR model (see diarization-bridge.ts) — showing the ASR
              backend here would be misleading, so only the ASR entry gets
              this badge. */}
          {(entry.kind ?? 'asr') === 'asr' && <BackendBadge backend={entry.backend} />}
          <StatusBadge status={preparing ? 'downloading' : entry.status} />
        </HStack>
      </HStack>

      {entry.description && entry.status !== 'failed' && !preparing && (
        <Text size="xs" variant="muted">
          {entry.description}
        </Text>
      )}

      {entry.status === 'downloading' && <ProgressRow entry={entry} />}

      {/* The "Failed" badge above is the one status indicator for this row —
          no second warning icon here, and no filled danger box ("brown
          slab"): just the short, readable reason plus Retry. */}
      {entry.status === 'failed' && <FailedRow entry={entry} />}

      {(entry.status === 'not-downloaded' || entry.status === 'cancelled') && (
        <Button
          variant="secondary"
          size={{ base: 'md', md: 'sm' }}
          leadingIcon={<Download className="size-3.5" />}
          onClick={openDialog}
          className="max-sm:w-full"
        >
          {t('action.download')}
        </Button>
      )}

      {entry.status === 'unavailable' && entry.error && (
        <Text size="xs" variant="muted">
          {entry.error}
        </Text>
      )}
    </VStack>
    </Card>
  );
}

function ProgressRow({ entry }: { entry: ModelEntry }) {
  const t = useT('models');
  const { progress } = entry;
  const etaText =
    progress.etaSeconds > 0 && !isNaN(progress.etaSeconds)
      ? ` · ${formatSeconds(progress.etaSeconds)} left`
      : '';

  // Right after a refresh mid-download, the resumed file is still doing
  // setup (checking what's already saved, re-establishing the connection)
  // before real bytes are flowing again — say "Resuming…" rather than a
  // progress bar frozen at the pre-refresh percentage.
  if (progress.resuming) {
    return (
      <VStack spacing="xs" className="w-full">
        <ProgressTrack value={null} label={t('progress.resuming')} />
        <Text size="xs" variant="muted" font="mono">
          {t('progress.resumingText').replace('{bytes}', formatBytes(progress.loadedBytes))}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing="xs" className="w-full">
      <ProgressTrack value={progress.percent} label={t('progress.download')} />
      <Text size="xs" variant="muted" font="mono" className="tabular-nums">
        {formatBytes(progress.loadedBytes)} / {formatBytes(progress.totalBytes)} ·{' '}
        {progress.percent}%{etaText}
      </Text>
    </VStack>
  );
}

const STATUS_BADGE: Record<
  ModelEntry['status'],
  { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' } | null
> = {
  'not-downloaded': null,
  downloading: { label: 'badge.downloading', variant: 'primary' },
  cached: { label: 'badge.cached', variant: 'success' },
  failed: { label: 'badge.failed', variant: 'danger' },
  cancelled: { label: 'badge.cancelled', variant: 'warning' },
  unavailable: { label: 'badge.unavailable', variant: 'neutral' },
};

function StatusBadge({ status }: { status: ModelEntry['status'] }) {
  const t = useT('models');
  const badge = STATUS_BADGE[status];
  if (!badge) return null;
  return (
    <Badge variant={badge.variant} size="sm" dot>
      {t(badge.label)}
    </Badge>
  );
}

/** Which backend this entry's files/quantisation target — see `model-manifest.ts`. */
function BackendBadge({ backend }: { backend: AsrBackend }) {
  const t = useT('models');
  const webgpu = backend === 'webgpu';
  const Icon = webgpu ? Zap : Cpu;
  return (
    <Tooltip
      content={t(webgpu ? 'tooltip.gpu' : 'tooltip.cpu')}
    >
      <Badge variant="neutral" size="sm">
        <Icon className="size-3" aria-hidden="true" />
        {webgpu ? 'GPU' : 'CPU'}
      </Badge>
    </Tooltip>
  );
}

function StatusIcon({ status, preparing }: { status: ModelEntry['status']; preparing: boolean }) {
  const cls = 'size-4 shrink-0';
  if (preparing) {
    return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} aria-hidden="true" />;
  }
  switch (status) {
    case 'cached':
      return <CheckCircle2 className={`${cls} text-success`} aria-hidden="true" />;
    case 'downloading':
      return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} aria-hidden="true" />;
    // Failed already has one status indicator — the "Failed" badge — so no
    // second (warning-triangle) icon here.
    case 'failed':
      return null;
    default:
      return <Cpu className={`${cls} text-muted-foreground`} aria-hidden="true" />;
  }
}

/* ------------------------------------------------------------------ */
/* Failed-download row — one readable line + Retry, no icon, no filled  */
/* danger box. Theme-token text colors only.                           */
/* ------------------------------------------------------------------ */

function FailedRow({ entry }: { entry: ModelEntry }) {
  const t = useT('models');
  const { summary, filename } = translatedDownloadError(entry.error, t);

  return (
    <HStack spacing="sm" justify="between" align="center" wrap className="w-full">
      <VStack spacing="none" className="min-w-0">
        <Text size="xs" variant="danger">
          {summary}
        </Text>
        {filename && (
          <Text size="xs" variant="muted" font="mono">
            {filename}
          </Text>
        )}
      </VStack>
      <Button
        variant="secondary"
        size="xs"
        onClick={() => void retryDownload(entry.key)}
        className="shrink-0"
      >
        {t('action.retry')}
      </Button>
    </HStack>
  );
}
