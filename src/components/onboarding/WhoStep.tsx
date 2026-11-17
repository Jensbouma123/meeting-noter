import { Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { updateSettings, useAppSettings } from '@/components/meeting/settingsStore';
import { useT } from '@/lib/i18n/useT';
import { addNameToVocabulary } from '@/lib/vocabulary/names';

export function WhoStep() {
  const t = useT('onboarding');
  const { ownerName } = useAppSettings();
  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('who.body')}</Text>
      <Input
        id="onboarding-owner-name"
        aria-label={t('who.label')}
        value={ownerName}
        onChange={(e) => updateSettings({ ownerName: e.target.value })}
        placeholder={t('who.placeholder')}
        onBlur={() => addNameToVocabulary(ownerName)}
        autoComplete="name"
      />
    </VStack>
  );
}
