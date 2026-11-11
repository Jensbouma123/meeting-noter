'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { CheckCircle2, Download, Info, Loader2, TriangleAlert, XCircle } from 'lucide-react';
import {
  formatBytes,
  formatSeconds,
  cancelDownloads,
  initiateDownloads,
  retryDownload,
  probeRegisteredModelSizes,
  type ModelEntry,
  type ModelProgress,
  type ModelStatus,
} from '@/lib/asr/browser';
import {
  subscribeRegistry,
  getState,
  getServerSnapshot,
  recordConsent,
  setDialogVisible,
  resetConsent,
} from '@/lib/asr/browser/model-registry';
import {
  ModelPreparationBar,
  describePreparation,
  isPreparing,
  parseDownloadError,
  translatedDownloadError,
  useModelPreparation,
} from './ModelPreparationProgress';
import { ProgressTrack } from '@/components/common/ProgressTrack';
import {
  Badge,
  Button,
  Card,
  HStack,
  Modal,
  Text,
  VStack,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ConsentDialogProps {
  /** Called when the dialog is fully closed (user dismissed or download completed). */
  onDismiss?: () => void;
}

/** Status → Badge tone. `Badge` maps these onto the `--badge-*-*` roles, which
 *  are the only text/background pairs the dark theme redefines. */
const STATUS_BADGE: Record<
  ModelStatus,
  { label: string; variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' } | null
> = {
  'not-downloaded': null,
  downloading: { label: 'Downloading', variant: 'primary' },
  cached: { label: 'Ready', variant: 'success' },
  failed: { label: 'Failed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'warning' },
  unavailable: { label: 'Not supported', variant: 'neutral' },
};

/* ------------------------------------------------------------------ */
/* ModelConsentDialog                                                  */
/* ------------------------------------------------------------------ */

export function ModelConsentDialog({ onDismiss }: ConsentDialogProps) {
  const t = useT('models');
  // Read the store directly. getState()/getServerSnapshot() return stable
  // references, so this does not loop, and it avoids setState-in-effect.
  const { entries, consentState: consent, dialogVisible } = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot
  );
  const titleId = useId();
  const [sizeKnown, setSizeKnown] = useState(false);
  // The engine's own preparation state, so this dialog shows the same
  // percentage the recording banner does. It is the *only* thing that can
  // report the initialization half (ORT reports no progress), and without it
  // this dialog went silent the moment the download finished — which, for a
  // model whose bytes were already on disk, is seconds after the user pressed
  // Download. See `ModelPreparationProgress.tsx`.
  const preparation = useModelPreparation();

  // The stated size is the single most important number in this dialog, and it
  // cannot come from a constant: the encoder's weights live in a 2.4 GB
  // external `.data` blob that no hand-written estimate accounts for. Measure
  // it before asking the user to commit to the download.
  useEffect(() => {
    let cancelled = false;
    if (Object.keys(entries).length === 0) return;
    void probeRegisteredModelSizes().then(() => {
      if (!cancelled) setSizeKnown(true);
    });
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const anyCached = Object.values(entries).some((e) => e.status === 'cached');
  const anyFailed = Object.values(entries).some((e) => e.status === 'failed');
  // Preparing, not just downloading. This is the difference between a dialog
  // that stays up until the model is genuinely usable and one that disappears
  // the moment the bytes land, leaving the user watching a frozen
  // "Initializing 35%" with no dialog and no explanation.
  const preparing = isPreparing(preparation);

  // Determine which models to show in the dialog.
  const modelsToShow = Object.values(entries).filter(
    (e) => e.status !== 'cached' && e.status !== 'unavailable'
  );

  const neverPrompted = consent === null || consent.decidedAt === null;
  const userDeclined = consent !== null && consent.choice === 'declined';

  const totalBytes = modelsToShow.reduce((sum, e) => sum + e.estimatedSizeBytes, 0);

  // Start downloads for every accepted model. A `failed` entry goes through
  // `retryDownload`, which resets its stale error/progress before restarting
  // — going through `initiateDownloads` alone would leave the old error text
  // and the old progress bar on screen until the first new progress event.
  //
  // The download is started *before* the dialog is re-shown, and consent is
  // recorded first, so the button's click is never followed by a frame in
  // which the dialog is hidden: `recordConsent()` deliberately does not touch
  // visibility (see `model-registry.ts`), and this is now the only place that
  // decides the dialog should be open.
  const startOrRetryDownloads = () => {
    const keys = Object.keys(entries);
    recordConsent('accepted', keys);
    const failedKeys = keys.filter((key) => entries[key]?.status === 'failed');
    setDialogVisible(true);
    if (failedKeys.length > 0) {
      void Promise.all(failedKeys.map((key) => retryDownload(key))).catch(() => {
        // Error handled by registry — the entry carries it.
      });
    } else {
      void initiateDownloads().catch(() => {
        // Error handled by registry — the entry carries it.
      });
    }
  };

  // The store owns visibility. If it says hidden, render nothing — otherwise
  // "Not now" and the backdrop/close button could not dismiss this dialog.
  if (!dialogVisible) return null;

  // Every model is on disk — but "on disk" is not "usable". The engine still
  // has to create its ONNX session before a recording transcribes anything,
  // and that is the step that can take a minute or fail outright. Dismissing
  // the dialog here is what produced "I pressed Download and the dialog just
  // closed": the download *had* completed, in seconds, and the dialog left
  // before the work that actually mattered had started.
  if (anyCached && modelsToShow.length === 0 && !preparing) {
    return null;
  }

  const heading = anyFailed
    ? t('dialog.failedTitle')
    : preparing
      ? t('dialog.preparingTitle')
      : t('dialog.downloadTitle');

  const subheading = anyFailed
    ? t('dialog.failedBody')
    : preparing
      ? t('dialog.preparingBody')
      : neverPrompted
        ? t('dialog.firstDownloadBody')
        : t('dialog.resumeBody');

  const primaryLabel = anyFailed
    ? t('action.retry')
    : t('action.downloadSize').replace('{size}', formatBytes(totalBytes));

  return (
    <Modal
      open
      onClose={() => {
        setDialogVisible(false);
        onDismiss?.();
      }}
      size="lg"
      title={heading}
      description={subheading}
      footer={
        preparing ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              size={{ base: 'md', md: 'sm' }}
              onClick={() => {
                setDialogVisible(false);
                onDismiss?.();
              }}
            >
              {t('action.continueBackground')}
            </Button>
          </div>
        ) : (
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {userDeclined && (
                <Button
                  variant="ghost"
                  size={{ base: 'md', md: 'sm' }}
                  onClick={() => {
                    resetConsent();
                    setDialogVisible(false);
                  }}
                >
                  {t('action.forgetChoice')}
                </Button>
              )}
              <Button
                variant="outline"
                size={{ base: 'md', md: 'sm' }}
                onClick={() => {
                  // User declined — mark entries as not-downloaded.
                  recordConsent('declined', []);
                  setDialogVisible(false);
                  // Also cancel any ongoing download.
                  cancelDownloads();
                  onDismiss?.();
                }}
              >
                {t('action.notNow')}
              </Button>
            </div>

            <Button
              variant="primary"
              size={{ base: 'md', md: 'sm' }}
              leadingIcon={<Download className="size-4" />}
              onClick={startOrRetryDownloads}
              className="w-full sm:w-auto"
            >
              {primaryLabel}
            </Button>
          </div>
        )
      }
    >
      <VStack spacing="md" className="w-full">
        <VStack spacing="sm" className="w-full">
          {modelsToShow.map((entry) => (
            <ModelCard key={entry.key} entry={entry} />
          ))}
        </VStack>

        {/* The engine's own progress, which no per-entry card can show: the
            cards only know about downloads, and "reading the model files" /
            "creating the session" / a fallback re-fetch live on the engine.
            Rendered whenever there is something to say, including when the
            per-entry list is empty because every model is already on disk. */}
        <ModelPreparationBar state={preparation} />

        <Text size="xs" variant="muted">
          {t('privacy.dialog')}
          {!sizeKnown && !preparing && !anyFailed && ` ${t('dialog.checkingSize')}`}
        </Text>

        {/* Progress is announced politely; the count is in the title already. */}
        <span id={titleId} className="sr-only" role="status" aria-live="polite">
          {describePreparation(preparation) ?? ''}
        </span>
      </VStack>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* ModelCard — single model entry display                              */
/* ------------------------------------------------------------------ */

function ModelCard({ entry }: { entry: ModelEntry }) {
  const t = useT('models');
  // The progress line (download progress or the error text) already states
  // the model's status, so the pill and size next to the name would just
  // repeat it. Only show them when nothing else on the card conveys status.
  const showPill = entry.status === 'failed' && !entry.error;
  const showSize = entry.status === 'not-downloaded';
  const badge = showPill ? STATUS_BADGE[entry.status] : null;

  return (
    <Card variant="bordered" padding="md" className="w-full">
      <VStack spacing="sm" className="w-full">
        <HStack spacing="sm" justify="between">
          <HStack spacing="sm" className="min-w-0">
            <StatusIcon status={entry.status} />
            <Text weight="semibold" size="sm" truncate>
              {entry.displayName}
            </Text>
          </HStack>

          <HStack spacing="xs" className="shrink-0">
            {badge && (
              <Badge variant={badge.variant} size="sm" dot>
                {t(`badge.${entry.status}`)}
              </Badge>
            )}
            {showSize && (
              <Text size="xs" variant="muted" font="mono">
                {formatBytes(entry.estimatedSizeBytes)}
              </Text>
            )}
          </HStack>
        </HStack>

        {/* Normally redundant with the dialog's own subheading, but this is
            the one place a per-entry notice can appear — e.g. a runtime
            WebGPU → CPU fallback (see browser-asr.ts), where the user needs
            to know *why* they're being asked to download again. */}
        {entry.status === 'not-downloaded' && entry.description && (
          <Text size="xs" variant="muted">
            {entry.description}
          </Text>
        )}

        {entry.status === 'downloading' && <ProgressBar progress={entry.progress} />}

        {entry.status === 'failed' && entry.error && <FailedDetail error={entry.error} />}

        {entry.status === 'cancelled' && (
          <Text size="sm" variant="muted">
            {t('error.cancelled')}
          </Text>
        )}
      </VStack>
    </Card>
  );
}

function FailedDetail({ error }: { error: string }) {
  const t = useT('models');
  const { summary, filename } = translatedDownloadError(error, t);
  return (
    <VStack spacing="none">
      <Text size="sm" variant="danger">
        {t('error.download')}
      </Text>
      <Text size="xs" variant="muted">
        {summary}
      </Text>
      {filename && (
        <Text size="xs" variant="subtle" font="mono" className="break-all">
          {filename}
        </Text>
      )}
    </VStack>
  );
}

/** Status glyph. Decorative — `Badge` already carries the textual state. */
function StatusIcon({ status }: { status: ModelStatus }) {
  const cls = 'size-4 shrink-0';
  switch (status) {
    case 'cached':
      return <CheckCircle2 className={`${cls} text-success`} />;
    case 'failed':
      return <XCircle className={`${cls} text-danger`} />;
    case 'cancelled':
      return <TriangleAlert className={`${cls} text-warning`} />;
    case 'downloading':
      return <Loader2 className={`${cls} text-primary-500 motion-safe:animate-spin`} />;
    default:
      return <Info className={`${cls} text-muted-foreground`} />;
  }
}

/* ------------------------------------------------------------------ */
/* ProgressBar — visual progress indicator                             */
/* ------------------------------------------------------------------ */

function ProgressBar({ progress }: { progress: ModelProgress }) {
  const t = useT('models');
  const throughputText =
    progress.throughputBytesPerSec > 0
      ? ` · ${formatBytes(progress.throughputBytesPerSec)}/s`
      : '';

  const etaText =
    progress.etaSeconds > 0 && !isNaN(progress.etaSeconds)
      ? ` · ${formatSeconds(progress.etaSeconds)} left`
      : '';

  return (
    <VStack spacing="xs" className="w-full">
      <ProgressTrack value={progress.percent} label={t('progress.download')} />
      <HStack spacing="xs" wrap>
        <Text size="xs" variant="muted" font="mono" className="tabular-nums">
          {formatBytes(progress.loadedBytes)} of {formatBytes(progress.totalBytes)}
        </Text>
        {throughputText && (
          <Text size="xs" variant="subtle" font="mono">
            {throughputText}
          </Text>
        )}
        {etaText && (
          <Text size="xs" variant="subtle" font="mono">
            {etaText}
          </Text>
        )}
        <Text size="xs" weight="semibold" variant="primary">
          {progress.percent}%
        </Text>
      </HStack>
    </VStack>
  );
}
