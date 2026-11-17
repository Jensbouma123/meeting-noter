'use client';

import { Alert, Button, ConfirmDialog, Text, VStack } from '@jensbouma123/acciva-ui';
import { useState } from 'react';
import { useT } from '@/lib/i18n/useT';
import { useUpdatePolling } from './useUpdatePolling';
import { useUpdate } from './useUpdate';

export function UpdateDialog({
  open,
  onClose,
  isRecording = false,
}: {
  open: boolean;
  onClose: () => void;
  isRecording?: boolean;
}) {
  const t = useT('update');
  const update = useUpdate(isRecording);
  const [confirmed, setConfirmed] = useState(false);
  const { status, setStatus, failed, setFailed } = useUpdatePolling({
    confirmed,
    open,
    apply: () => update.apply(),
  });

  const info = update.info;
  const failedText =
    status?.code === 'rolled-back' ? t('rolledBack').replace('{version}', status.fromVersion ?? '') : t('failed');
  const phaseKey =
    status?.phase === 'downloading'
      ? 'phaseDownloading'
      : status?.phase === 'installing'
        ? 'phaseInstalling'
        : status?.phase === 'restarting'
          ? 'phaseRestarting'
          : status?.phase === 'model'
            ? 'phaseModel'
            : 'phaseStarting';

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={() => setConfirmed(true)}
      title={t('confirmTitle').replace('{version}', info?.latest ?? '')}
      description={
        update.blockedRecording
          ? t('blockedRecording')
          : failed
            ? failedText
            : status?.state === 'done'
              ? t(status.restartRequired ? 'restartRequired' : 'done').replace('{version}', status.toVersion ?? '')
              : confirmed
                ? t(phaseKey)
                : t('confirmBody')
      }
      confirmText={confirmed ? t('updating') : t('confirm')}
      cancelText={t('cancel')}
      variant="primary"
      loading={confirmed}
    >
      {confirmed && (
        <VStack spacing="sm" className="w-full">
          {failed && (
            <Alert variant="danger" layout="inline">
              {failedText}
            </Alert>
          )}
          {failed && status?.detail && <Text size="sm">{status.detail}</Text>}
          {status?.percent !== null && status?.percent !== undefined && <Text size="sm">{status.percent}%</Text>}
          {(failed || status?.state === 'done') && (
            <Button
              variant="outline"
              onClick={() => {
                setConfirmed(false);
                setFailed(false);
                setStatus(null);
              }}
            >
              {failed ? t('retry') : t('cancel')}
            </Button>
          )}
        </VStack>
      )}
    </ConfirmDialog>
  );
}
