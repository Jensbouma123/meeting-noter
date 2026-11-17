import { useContext } from 'react';
import { Button, HStack, Text, VStack } from '@jensbouma123/acciva-ui';
import { updateSettings } from '@/components/meeting/settingsStore';
import { SetLanguageContext } from '@/lib/i18n/LanguageContext';
import type { Language } from '@/lib/i18n/types';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useT } from '@/lib/i18n/useT';

const OPTIONS: Array<{ code: Language; key: 'language.nl' | 'language.en' }> = [
  { code: 'nl', key: 'language.nl' },
  { code: 'en', key: 'language.en' },
];

export function LanguageStep() {
  const t = useT('onboarding');
  const language = useLanguage();
  const setLanguage = useContext(SetLanguageContext);

  const choose = (next: Language) => {
    updateSettings({ language: next });
    setLanguage?.(next);
  };

  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('language.body')}</Text>
      <HStack spacing="sm">
        {OPTIONS.map(({ code, key }) => (
          <Button
            key={code}
            variant={language === code ? 'primary' : 'outline'}
            size={{ base: 'md', md: 'sm' }}
            aria-pressed={language === code}
            onClick={() => choose(code)}
          >
            {t(key)}
          </Button>
        ))}
      </HStack>
    </VStack>
  );
}
