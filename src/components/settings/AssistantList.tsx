'use client';

import { Alert } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantCard } from './AssistantCard';
import { SettingsGroup } from './SettingsGroup';
import type { AssistantInfo, AssistantListProps } from './Assistant.types';

export function isInstalledAssistant(assistant: AssistantInfo): boolean {
  return typeof assistant.installed === 'boolean' ? assistant.installed : assistant.status !== 'not-found';
}

export function AssistantList({ assistants, state }: AssistantListProps) {
  const t = useT('assistant');
  const installed = assistants.filter(isInstalledAssistant);
  if (installed.length === 0) {
    return (
      <Alert variant="info" layout="inline">
        {t('noneInstalled')}
      </Alert>
    );
  }
  return (
    <SettingsGroup>
      {installed.map((a) => (
        <AssistantCard
          key={a.id}
          assistant={a}
          busy={state.busyId === a.id}
          error={state.errors[a.id] ?? null}
          confirm={state.confirmFor[a.id] ?? null}
          restartNotice={!!state.restart[a.id]}
          onConnect={(confirmed) => void state.connect(a.id, confirmed)}
          onDisconnect={() => void state.disconnect(a.id)}
          onCancelConfirm={() => state.cancelConfirm(a.id)}
        />
      ))}
    </SettingsGroup>
  );
}
