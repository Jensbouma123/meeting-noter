import { Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { addNameToVocabulary } from '@/lib/vocabulary/names';
import type { OnboardingDialogProps } from './types';

export function WhoStep({ settings, onSettingsChange }: OnboardingDialogProps) {
  const t = useT('onboarding');
  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('who.body')}</Text>
      <Input
        id="onboarding-owner-name"
        aria-label={t('who.label')}
        value={settings.ownerName}
        onChange={(e) => onSettingsChange({ ...settings, ownerName: e.target.value })}
        placeholder={t('who.placeholder')}
        onBlur={() => addNameToVocabulary(settings.ownerName)}
        autoComplete="name"
      />
    </VStack>
  );
}
