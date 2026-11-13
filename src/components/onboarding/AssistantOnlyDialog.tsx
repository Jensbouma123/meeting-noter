import { Button, Modal } from '@jensbouma123/acciva-ui';
import { useAssistantState } from '@/components/settings/AssistantState';
import { SEARCH_REGISTRY_KEY } from '@/lib/asr/browser/model-registry-known-keys';
import { useT } from '@/lib/i18n/useT';
import { finishAssistantOnboarding } from '@/lib/onboarding/store';
import { AssistantStep } from './AssistantStep';
import { useOnboardingModels } from './useOnboardingModels';

export function AssistantOnlyDialog() {
  const t = useT('onboarding');
  const models = useOnboardingModels();
  const assistants = useAssistantState();
  const searchEntry = models.list.find((e) => e.key === SEARCH_REGISTRY_KEY);
  const detecting = assistants.assistants === null && !assistants.loadFailed;
  return (
    <Modal
      open
      onClose={finishAssistantOnboarding}
      size="lg"
      title={t('assistant.title')}
      footer={
        <div className="dialog-actions flex w-full justify-end">
          <Button
            variant="primary"
            size={{ base: 'md', md: 'sm' }}
            onClick={finishAssistantOnboarding}
            disabled={detecting}
            className="w-full sm:w-auto"
          >
            {t('finish')}
          </Button>
        </div>
      }
    >
      <AssistantStep
        state={assistants}
        searchMissing={!!searchEntry && searchEntry.status !== 'cached'}
        onSkip={finishAssistantOnboarding}
      />
    </Modal>
  );
}
