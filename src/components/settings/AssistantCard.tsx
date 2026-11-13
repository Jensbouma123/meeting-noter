'use client';

import { Alert, Badge, Button, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantDetails } from './AssistantDetails';
import { AssistantConfirm } from './AssistantConfirm';
import { AssistantCopyButton } from './AssistantCopyButton';
import { ASSISTANT_NAMES } from './AssistantNames';
import { AssistantLogo } from './AssistantLogo';
import { SettingsRow } from './SettingsRow';
import type { AssistantCardProps } from './Assistant.types';

const BADGE = { connected: 'success', 'needs-repair': 'warning', 'not-connected': 'neutral', 'not-found': 'warning' } as const;

export function AssistantCard({ assistant, busy, error, confirm, restartNotice, onConnect, onDisconnect, onCancelConfirm }: AssistantCardProps) {
  const t = useT('assistant');
  const { id, status, canAutoConnect, manualCommand, configPath } = assistant;
  const isDesktop = id === 'claude-desktop';
  const control =
    status === 'needs-repair' ? (
      <Button onClick={() => onConnect(false)} disabled={busy || !!confirm}>{t('repair')}</Button>
    ) : status === 'connected' ? (
      <Button variant="danger" onClick={onDisconnect} disabled={busy}>{t('disconnect')}</Button>
    ) : status === 'not-found' ? null : canAutoConnect ? (
      <Button onClick={() => onConnect(false)} disabled={busy || !!confirm}>{t('connect')}</Button>
    ) : manualCommand ? (
      <AssistantCopyButton text={manualCommand} label={t('copyCommand')} />
    ) : null;

  return (
    <div role="group" aria-label={ASSISTANT_NAMES[id]}>
      <SettingsRow
        label={
          <span className="flex items-center gap-3">
            <AssistantLogo id={id} />
            {ASSISTANT_NAMES[id]}
            <Badge variant={BADGE[status]} size="sm">{t(`status.${status}`)}</Badge>
          </span>
        }
        description={t(status === 'not-found' ? 'notFoundHint' : `hint.${id}`)}
        control={control}
        footer={(configPath || manualCommand) && <AssistantDetails configPath={configPath} manualCommand={manualCommand} />}
      />
      {isDesktop && confirm && (
        <AssistantConfirm backupPath={confirm.backupPath} busy={busy} onConfirm={() => onConnect(true)} onCancel={onCancelConfirm} />
      )}
      {restartNotice && <Text size="xs" variant="muted" className="px-4 pb-3">{t(`restart.${id}`)}</Text>}
      {error && <Alert variant="danger" layout="inline">{t('error')}</Alert>}
    </div>
  );
}
