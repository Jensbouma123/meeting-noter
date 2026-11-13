import { useState } from 'react';
import { Modal, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { finishOnboarding } from '@/lib/onboarding/store';
import { STEPS } from './constants';
import { fillTemplate } from './fillTemplate';
import { ModelsStep } from './ModelsStep';
import { OnboardingFooter } from './OnboardingFooter';
import { WhoStep } from './WhoStep';
import { WordsStep } from './WordsStep';
import { useOnboardingModels } from './useOnboardingModels';
import type { OnboardingDialogProps, StepId } from './types';

export function OnboardingSteps({ settings, onSettingsChange }: OnboardingDialogProps) {
  const t = useT('onboarding');
  const [stepId, setStepId] = useState<StepId>('welcome');
  const models = useOnboardingModels();
  const step = STEPS.indexOf(stepId) + 1;
  const isLast = stepId === 'done';

  const move = (delta: 1 | -1) => {
    let i = STEPS.indexOf(stepId) + delta;
    if (STEPS[i] === 'models' && models.modelsReady) i += delta;
    setStepId(STEPS[i]);
  };

  return (
    <Modal
      open
      onClose={finishOnboarding}
      size="lg"
      title={t(`${stepId}.title`)}
      description={fillTemplate(t('step'), { n: step, total: STEPS.length })}
      footer={
        <OnboardingFooter
          step={step}
          isLast={isLast}
          onSkip={finishOnboarding}
          onBack={() => move(-1)}
          onNext={() => move(1)}
        />
      }
    >
      <VStack spacing="md" className="w-full">
        {stepId === 'welcome' && <Text size="sm">{t('welcome.body')}</Text>}
        {stepId === 'who' && <WhoStep settings={settings} onSettingsChange={onSettingsChange} />}
        {stepId === 'models' && <ModelsStep models={models} />}
        {stepId === 'words' && <WordsStep />}
        {stepId === 'done' && (
          <VStack spacing="sm" className="w-full">
            <Text size="sm">{t('done.body')}</Text>
            <Text size="xs" variant="muted">
              {t('done.reopen')}
            </Text>
          </VStack>
        )}
      </VStack>
    </Modal>
  );
}
