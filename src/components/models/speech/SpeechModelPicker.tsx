import { useState, useSyncExternalStore } from 'react';
import { Alert, Radio, RadioGroup, VStack } from '@jensbouma123/acciva-ui';
import { selectSpeechModel } from '@/lib/meeting/browser-asr';
import {
  getAsrModelFamily,
  getServerAsrModelFamily,
  subscribeAsrModelFamily,
  type AsrModelFamily,
} from '@/lib/asr/browser/model-family';
import { useT } from '@/lib/i18n/useT';

export function SpeechModelPicker() {
  const t = useT('models');
  const family = useSyncExternalStore(subscribeAsrModelFamily, getAsrModelFamily, getServerAsrModelFamily);
  const [refused, setRefused] = useState(false);
  const choose = (next: AsrModelFamily) => setRefused(!selectSpeechModel(next));
  return (
    <VStack spacing="xs" className="w-full">
      <RadioGroup value={family} onChange={(v) => choose(v as AsrModelFamily)} orientation="vertical">
        <Radio
          value="parakeet"
          label="Parakeet TDT 0.6B v3"
          description={t('model.parakeet.description')}
        />
        <Radio
          value="nemotron"
          label="Nemotron 3.5 ASR Streaming 0.6B"
          description={t('model.nemotron.description')}
        />
      </RadioGroup>
      {refused && (
        <Alert variant="warning" layout="inline">
          {t('model.switchBlocked')}
        </Alert>
      )}
    </VStack>
  );
}
