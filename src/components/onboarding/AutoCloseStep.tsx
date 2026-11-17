import { Checkbox, Text, VStack } from '@jensbouma123/acciva-ui';
import { IDLE_DEFAULTS } from '@/lib/lifecycle/constants';
import { useT } from '@/lib/i18n/useT';
import { fillTemplate } from './fillTemplate';

export function AutoCloseStep({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const t = useT('onboarding');
  const body = fillTemplate(t('autoclose.body'), {
    close: IDLE_DEFAULTS.closeGraceMs / 1000,
    stale: IDLE_DEFAULTS.staleMs / 60_000,
    rec: IDLE_DEFAULTS.recordingStaleMs / 60_000,
  });
  return (
    <VStack spacing="sm" className="w-full items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/meeting-noter-icon.png" alt={t('autoclose.logo')} width={72} height={72} />
      <Text size="sm">{body}</Text>
      <Text size="sm">{t('autoclose.restart')}</Text>
      <label htmlFor="onboarding-autoclose" className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          id="onboarding-autoclose"
          checked={checked}
          className="mt-1 shrink-0"
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{t('autoclose.label')}</span>
      </label>
    </VStack>
  );
}
