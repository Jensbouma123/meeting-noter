'use client';

import { Alert, Badge, Button } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantDetails } from './AssistantDetails';
import { AssistantConfirm } from './AssistantConfirm';
import { AssistantCopyButton } from './AssistantCopyButton';
import { SettingsRow } from './SettingsRow';
import type { AssistantCardProps } from './Assistant.types';

const NAMES = { 'claude-desktop': 'Claude Desktop', 'claude-code': 'Claude Code', codex: 'Codex' } as const;
const BADGE = { connected: 'success', 'needs-repair': 'warning', 'not-connected': 'neutral', 'not-found': 'warning' } as const;

export function AssistantCard({ assistant, busy, error, confirm, onConnect, onDisconnect, onCancelConfirm }: AssistantCardProps) {
  const t = useT('assistant');
  const { id, status, canAutoConnect, manualCommand, configPath } = assistant;
  const isDesktop = id === 'claude-desktop';
  const control =
    status === 'needs-repair' ? (
      <Button onClick={() => onConnect(false)} disabled={busy || !!confirm}>{t('repair')}</Button>
    ) : status === 'connected' ? (
      <Button variant="secondary" onClick={onDisconnect} disabled={busy}>{t('disconnect')}</Button>
    ) : status === 'not-found' ? null : canAutoConnect ? (
      <Button onClick={() => onConnect(false)} disabled={busy || !!confirm}>{t('connect')}</Button>
    ) : manualCommand ? (
      <AssistantCopyButton text={manualCommand} label={t('copyCommand')} />
    ) : null;

  return (
    <div>
      <SettingsRow
        label={
          <span className="flex items-center gap-2">
            {NAMES[id]}
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
      {error && <Alert variant="danger" layout="inline">{t('error')}</Alert>}
    </div>
  );
}
