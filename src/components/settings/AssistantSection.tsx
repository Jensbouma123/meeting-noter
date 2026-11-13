'use client';

import { Alert, Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantList } from './AssistantList';
import { AssistantLoading } from './AssistantLoading';
import { AssistantExamples } from './AssistantExamples';
import { useAssistantState } from './AssistantState';

export function AssistantSection() {
  const t = useT('assistant');
  const state = useAssistantState();
  return (
    <>
      <Text size="sm" variant="muted">{t('intro')}</Text>
      {state.loadFailed && <Alert variant="danger" layout="inline">{t('loadFailed')}</Alert>}
      {state.assistants === null && !state.loadFailed && <AssistantLoading />}
      {state.assistants && <AssistantList assistants={state.assistants} state={state} />}
      <AssistantExamples />
    </>
  );
}
