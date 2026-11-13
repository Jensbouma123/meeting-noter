import { Alert, Button, Text, VStack } from '@jensbouma123/acciva-ui';
import { AssistantList } from '@/components/settings/AssistantList';
import { AssistantLoading } from '@/components/settings/AssistantLoading';
import { useT } from '@/lib/i18n/useT';
import type { AssistantStepProps } from './types';

export function AssistantStep({ state, searchMissing, onSkip }: AssistantStepProps) {
  const t = useT('onboarding');
  const a = useT('assistant');
  const { assistants, loadFailed } = state;
  const anyMissing = !!assistants?.some((x) => x.status === 'not-found');
  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('assistant.body')}</Text>
      {loadFailed && <Alert variant="danger" layout="inline">{a('loadFailed')}</Alert>}
      {assistants === null && !loadFailed && <AssistantLoading />}
      {assistants && <AssistantList assistants={assistants} state={state} />}
      {anyMissing && <Text size="xs" variant="muted">{t('assistant.install')}</Text>}
      {searchMissing && <Text size="xs" variant="muted">{t('assistant.search')}</Text>}
      <div>
        <Button variant="ghost" size={{ base: 'md', md: 'sm' }} onClick={onSkip}>
          {t('assistant.skip')}
        </Button>
      </div>
    </VStack>
  );
}
