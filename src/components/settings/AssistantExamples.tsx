'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { AssistantCopyIcon } from './AssistantCopyIcon';
import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

const EXAMPLES = ['example1', 'example2'] as const;

export function AssistantExamples() {
  const t = useT('assistant');
  return (
    <SettingsGroup>
      <div className="p-4">
        <Text size="sm" weight="medium">{t('examplesTitle')}</Text>
      </div>
      {EXAMPLES.map((key) => (
        <SettingsRow key={key} label={t(key)} control={<AssistantCopyIcon text={t(key)} />} />
      ))}
    </SettingsGroup>
  );
}
