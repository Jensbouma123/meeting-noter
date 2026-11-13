'use client';

import { Alert, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantCard } from './AssistantCard';
import { AssistantLoading } from './AssistantLoading';
import { AssistantExamples } from './AssistantExamples';
import { useAssistantState } from './AssistantState';
import { SettingsGroup } from './SettingsGroup';

export function AssistantSection() {
  const t = useT('assistant');
  const state = useAssistantState();
  return (
    <>
      <Text size="sm" variant="muted">{t('intro')}</Text>
      {state.loadFailed && <Alert variant="danger" layout="inline">{t('loadFailed')}</Alert>}
      {state.assistants === null && !state.loadFailed && <AssistantLoading />}
      {state.assistants && (
        <SettingsGroup>
          {state.assistants.map((a) => (
            <AssistantCard
              key={a.id}
              assistant={a}
              busy={state.busyId === a.id}
              error={state.errors[a.id] ?? null}
              confirm={state.confirmFor[a.id] ?? null}
              onConnect={(confirmed) => void state.connect(a.id, confirmed)}
              onDisconnect={() => void state.disconnect(a.id)}
              onCancelConfirm={() => state.cancelConfirm(a.id)}
            />
          ))}
        </SettingsGroup>
      )}
      <AssistantExamples />
    </>
  );
}
