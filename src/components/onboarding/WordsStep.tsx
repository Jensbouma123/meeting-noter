import { Text, VStack } from '@jensbouma123/acciva-ui';
import { VocabularyAddField } from '@/components/settings/VocabularyAddField';
import { useT } from '@/lib/i18n/useT';
import { useVocabulary } from '@/lib/vocabulary/store';
import { fillTemplate } from './fillTemplate';

export function WordsStep() {
  const t = useT('onboarding');
  const { entries: words } = useVocabulary();
  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('words.body')}</Text>
      <VocabularyAddField id="onboarding-words" placeholder="Framna" />
      {words.length > 0 && (
        <Text size="xs" variant="muted">
          {fillTemplate(t('words.inList'), { list: words.map((w) => w.word).join(', ') })}
        </Text>
      )}
    </VStack>
  );
}
