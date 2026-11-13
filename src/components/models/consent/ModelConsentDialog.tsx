'use client';

import { useId, useSyncExternalStore } from 'react';
import { formatBytes } from '@/lib/asr/browser';
import { subscribeRegistry, getState, getServerSnapshot, setDialogVisible } from '@/lib/asr/browser/model-registry';
import { Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { describePreparation, isPreparing } from '../preparation/describePreparation';
import { ModelPreparationBar } from '../preparation/ModelPreparationBar';
import { useModelPreparation } from '../preparation/useModelPreparation';
import { useModelSizesKnown } from '../useModelSizesKnown';
import { ConsentFooter } from './ConsentFooter';
import { ModelCard } from './ModelCard';
import { acceptConsentAndStartDownloads } from './startOrRetryDownloads';
import type { ConsentDialogProps } from './types';

export function ModelConsentDialog({ onDismiss }: ConsentDialogProps) {
  const t = useT('models');
  const { entries, consentState: consent, dialogVisible } = useSyncExternalStore(
    subscribeRegistry,
    getState,
    getServerSnapshot
  );
  const titleId = useId();
  const sizeKnown = useModelSizesKnown(entries);
  const preparation = useModelPreparation();

  const anyCached = Object.values(entries).some((e) => e.status === 'cached');
  const anyFailed = Object.values(entries).some((e) => e.status === 'failed');
  const preparing = isPreparing(preparation);

  const modelsToShow = Object.values(entries).filter(
    (e) => e.status !== 'cached' && e.status !== 'unavailable'
  );

  const neverPrompted = consent === null || consent.decidedAt === null;
  const userDeclined = consent !== null && consent.choice === 'declined';

  const totalBytes = modelsToShow.reduce((sum, e) => sum + e.estimatedSizeBytes, 0);

  if (!dialogVisible) return null;

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

  const dismiss = () => {
    setDialogVisible(false);
    onDismiss?.();
  };

  return (
    <Modal
      open
      onClose={dismiss}
      size="lg"
      title={heading}
      description={subheading}
      footer={
        <ConsentFooter
          preparing={preparing}
          userDeclined={userDeclined}
          primaryLabel={primaryLabel}
          onStartDownloads={() => acceptConsentAndStartDownloads(entries)}
          onDismiss={onDismiss}
        />
      }
    >
      <VStack spacing="md" className="w-full">
        <VStack spacing="sm" className="w-full">
          {modelsToShow.map((entry) => (
            <ModelCard key={entry.key} entry={entry} />
          ))}
        </VStack>

        <ModelPreparationBar state={preparation} />

        <Text size="xs" variant="muted">
          {t('privacy.dialog')}
          {!sizeKnown && !preparing && !anyFailed && ` ${t('dialog.checkingSize')}`}
        </Text>

        <span id={titleId} className="sr-only" role="status" aria-live="polite">
          {describePreparation(preparation) ?? ''}
        </span>
      </VStack>
    </Modal>
  );
}
