import { useState } from 'react';
import { Text, VStack } from '@jensbouma123/acciva-ui';
import { useAssistantState } from '@/components/settings/AssistantState';
import { useT } from '@/lib/i18n/useT';
import { finishOnboarding, isAckAccepted, isAutoCloseAccepted, setAckAccepted, setAutoCloseAccepted } from '@/lib/onboarding/store';
import { useOnboardingReopened } from '@/lib/onboarding/useOnboardingReopened';
import { STEPS } from './constants';
import { fillTemplate } from './fillTemplate';
import { AckStep } from './AckStep';
import { AutoCloseStep } from './AutoCloseStep';
import { AssistantStep } from './AssistantStep';
import { ModelsStep } from './ModelsStep';
import { OnboardingModal } from './OnboardingModal';
import { OnboardingFooter } from './OnboardingFooter';
import { WhoStep } from './WhoStep';
import { WordsStep } from './WordsStep';
import { useOnboardingModels } from './useOnboardingModels';
import type { StepId } from './types';

export function OnboardingSteps() {
  const t = useT('onboarding');
  const [stepId, setStepId] = useState<StepId>('welcome');
  const [ackChecked, setAckChecked] = useState(isAckAccepted);
  const [autoCloseChecked, setAutoCloseChecked] = useState(isAutoCloseAccepted);
  const closable = useOnboardingReopened();
  const models = useOnboardingModels();
  const assistants = useAssistantState();
  const detecting = assistants.assistants === null && !assistants.loadFailed;
  const step = STEPS.indexOf(stepId) + 1;
  const isLast = stepId === 'done';

  const move = (delta: 1 | -1) => {
    if (delta === 1 && stepId === 'ack') setAckAccepted(true);
    if (delta === 1 && stepId === 'autoclose') setAutoCloseAccepted(true);
    let i = STEPS.indexOf(stepId) + delta;
    if (STEPS[i] === 'models' && models.modelsReady) i += delta;
    setStepId(STEPS[i]);
  };

  return (
    <OnboardingModal
      closable={closable}
      onClose={finishOnboarding}
      size="lg"
      title={t(`${stepId}.title`)}
      description={fillTemplate(t('step'), { n: step, total: STEPS.length })}
      footer={
        <OnboardingFooter
          step={step}
          isLast={isLast}
          nextDisabled={
            (stepId === 'assistant' && detecting) || (stepId === 'ack' && !ackChecked) ||
            (stepId === 'autoclose' && !autoCloseChecked)
          }
          onSkip={closable || isLast ? finishOnboarding : undefined}
          onBack={() => move(-1)}
          onNext={() => move(1)}
        />
      }
    >
      <VStack spacing="md" className="w-full">
        {stepId === 'welcome' && <Text size="sm">{t('welcome.body')}</Text>}
        {stepId === 'who' && <WhoStep />}
        {stepId === 'ack' && <AckStep checked={ackChecked} onChange={setAckChecked} />}
        {stepId === 'models' && <ModelsStep models={models} onContinue={() => move(1)} />}
        {stepId === 'assistant' && (
          <AssistantStep
            state={assistants}
            searchMissing={models.searchMissing}
            onSkip={() => move(1)}
          />
        )}
        {stepId === 'words' && <WordsStep />}
        {stepId === 'autoclose' && <AutoCloseStep checked={autoCloseChecked} onChange={setAutoCloseChecked} />}
        {stepId === 'done' && (
          <VStack spacing="sm" className="w-full">
            <Text size="sm">{t('done.body')}</Text>
            <Text size="xs" variant="muted">
              {t('done.reopen')}
            </Text>
          </VStack>
        )}
      </VStack>
    </OnboardingModal>
  );
}
