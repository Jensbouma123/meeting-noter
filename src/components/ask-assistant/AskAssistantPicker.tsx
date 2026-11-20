'use client';

import { Check, Settings } from 'lucide-react';
import { AssistantLogo } from '@/components/settings/AssistantLogo';
import { ASSISTANT_NAMES } from '@/components/settings/AssistantNames';
import { storeLastAssistant } from '@/lib/ask-assistant/lastAssistantStore';
import { useT } from '@/lib/i18n/useT';
import { AskMenuRow } from './AskMenuRow';
import type { AskAssistantPickerProps } from './AskAssistantPicker.types';

const OPTION_CLASS =
  'focus-ring touch-target-44 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors outline-none hover:bg-primary-500/10 focus-visible:bg-primary-500/10 dark:hover:bg-primary-400/20';

export function AskAssistantPicker({ assistantId, configuredIds, onOpenSettings }: AskAssistantPickerProps) {
  const t = useT('ask');
  if (configuredIds.length === 0) {
    return (
      <AskMenuRow
        icon={<Settings className="size-4" />}
        title={t('setup')}
        hint={t('setupHint')}
        onClick={onOpenSettings}
      />
    );
  }
  return (
    <div role="group" aria-label={t('assistantHeading')}>
      {configuredIds.map((id) => {
        const selected = id === assistantId;
        return (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            tabIndex={-1}
            onClick={() => storeLastAssistant(id)}
            className={OPTION_CLASS}
          >
            <AssistantLogo id={id} size={16} />
            <span className="flex-1">{ASSISTANT_NAMES[id]}</span>
            {selected && <Check className="size-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
