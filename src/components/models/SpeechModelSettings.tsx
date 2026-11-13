'use client';

import { useSyncExternalStore } from 'react';
import { subscribeRegistry, getState, getServerSnapshot } from '@/lib/asr/browser';
import { Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { ModelPreparationBar } from './preparation/ModelPreparationBar';
import { useModelPreparation } from './preparation/useModelPreparation';
import { DeleteDownloadedModels } from './speech/DeleteDownloadedModels';
import { ModelStatusRow } from './speech/ModelStatusRow';
import { SpeechModelPicker } from './speech/SpeechModelPicker';

export function SpeechModelSettings() {
  const t = useT('models');
  const { entries } = useSyncExternalStore(subscribeRegistry, getState, getServerSnapshot);
  const models = Object.values(entries);
  const preparation = useModelPreparation();

  if (models.length === 0) return null;

  return (
    <VStack spacing="sm" className="w-full">
      <Text size="xs" variant="muted">
        {t('privacy.device')}
      </Text>

      <SpeechModelPicker />

      <ModelPreparationBar state={preparation} />

      <VStack spacing="sm" className="w-full">
        {models.map((entry) => (
          <ModelStatusRow key={entry.key} entry={entry} preparation={preparation} />
        ))}
      </VStack>

      <DeleteDownloadedModels models={models} preparation={preparation} />
    </VStack>
  );
}
