import { Button } from '@jensbouma123/acciva-ui';
import { useAssistantState } from '@/components/settings/AssistantState';
import { OnboardingModal } from './OnboardingModal';
import { useT } from '@/lib/i18n/useT';
import { finishAssistantOnboarding } from '@/lib/onboarding/store';
import { AssistantStep } from './AssistantStep';
import { useOnboardingModels } from './useOnboardingModels';

export function AssistantOnlyDialog() {
  const t = useT('onboarding');
  const models = useOnboardingModels();
  const assistants = useAssistantState();
  const detecting = assistants.assistants === null && !assistants.loadFailed;
  return (
    <OnboardingModal
      closable={false}
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
        searchMissing={models.searchMissing}
        onSkip={finishAssistantOnboarding}
      />
    </OnboardingModal>
  );
}
