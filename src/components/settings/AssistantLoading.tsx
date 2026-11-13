'use client';

import { Text } from '@jensbouma123/acciva-ui';
import { ASSISTANT_IDS } from '@/lib/assistants/ids';
import { useT } from '@/lib/i18n/useT';
import { ASSISTANT_NAMES } from './AssistantNames';
import { AssistantLogo } from './AssistantLogo';
import { SettingsGroup } from './SettingsGroup';

export function AssistantLoading() {
  const t = useT('assistant');
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
      <SettingsGroup>
        {ASSISTANT_IDS.map((id) => (
          <div
            key={id}
            role="group"
            aria-label={ASSISTANT_NAMES[id]}
            data-testid={`assistant-placeholder-${id}`}
            className="flex w-full items-center gap-3 p-4 motion-safe:animate-pulse"
          >
            <AssistantLogo id={id} />
            <Text size="sm" weight="medium">{ASSISTANT_NAMES[id]}</Text>
            <span className="ml-auto h-6 w-20 rounded-full bg-border-subtle" aria-hidden="true" />
          </div>
        ))}
      </SettingsGroup>
      <Text size="xs" variant="muted">{t('loading')}</Text>
    </div>
  );
}
