'use client';

import { Alert, Badge, Button, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantConfirm } from './AssistantConfirm';
import { AssistantCopyButton } from './AssistantCopyButton';
import { SettingsRow } from './SettingsRow';
import type { AssistantCardProps } from './Assistant.types';

const NAMES = { 'claude-desktop': 'Claude Desktop', 'claude-code': 'Claude Code', codex: 'Codex' } as const;
const BADGE = { connected: 'success', 'not-connected': 'neutral', 'not-found': 'warning' } as const;

export function AssistantCard({ assistant, busy, error, confirm, onConnect, onDisconnect, onCancelConfirm }: AssistantCardProps) {
  const t = useT('assistant');
  const { id, status, canAutoConnect, manualCommand, configPath } = assistant;
  const isDesktop = id === 'claude-desktop';
  const control =
    status === 'connected' ? (
      <Button variant="secondary" onClick={onDisconnect} disabled={busy}>{t('disconnect')}</Button>
    ) : status === 'not-found' ? null : canAutoConnect ? (
      <Button onClick={() => onConnect(false)} disabled={busy || !!confirm}>{t('connect')}</Button>
    ) : manualCommand ? (
      <AssistantCopyButton text={manualCommand} label={t('copyCommand')} />
    ) : null;

  return (
    <>
      <SettingsRow
        label={
          <span className="flex items-center gap-2">
            {NAMES[id]}
            <Badge variant={BADGE[status]} size="sm">{t(`status.${status}`)}</Badge>
          </span>
        }
        description={t(status === 'not-found' ? 'notFoundHint' : `hint.${id}`)}
        control={control}
      />
      {isDesktop && confirm && (
        <AssistantConfirm backupPath={confirm.backupPath} busy={busy} onConfirm={() => onConnect(true)} onCancel={onCancelConfirm} />
      )}
      {error && <Alert variant="danger" layout="inline">{t('error')}</Alert>}
      {(configPath || manualCommand) && (
        <details className="px-4 pb-4">
          <summary className="cursor-pointer text-xs text-muted">{t('details')}</summary>
          <div className="mt-2 flex flex-col gap-1">
            {configPath && <Text size="xs" variant="muted" font="mono" className="break-all">{configPath}</Text>}
            {manualCommand && <Text size="xs" variant="muted" font="mono" className="break-all">{manualCommand}</Text>}
          </div>
        </details>
      )}
    </>
  );
}
