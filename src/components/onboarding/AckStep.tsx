import { Checkbox, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';

export function AckStep({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const t = useT('onboarding');
  return (
    <VStack spacing="sm" className="w-full">
      <Text size="sm">{t('ack.body')}</Text>
      <label htmlFor="onboarding-ack" className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          id="onboarding-ack"
          checked={checked}
          className="mt-1 shrink-0"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{t('ack.label')}</span>
      </label>
    </VStack>
  );
}
