'use client';

import { Alert, Button, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { AssistantConfirmProps } from './Assistant.types';

export function AssistantConfirm({ backupPath, busy, onConfirm, onCancel }: AssistantConfirmProps) {
  const t = useT('assistant');
  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Alert variant="info" layout="inline">
        {t('confirmText')} <span className="font-mono break-all">{backupPath}</span>
      </Alert>
      <Text size="xs" variant="muted">{t('confirmRestart')}</Text>
      <div className="flex gap-2">
        <Button onClick={onConfirm} disabled={busy}>{t('confirmYes')}</Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>{t('cancel')}</Button>
      </div>
    </div>
  );
}
