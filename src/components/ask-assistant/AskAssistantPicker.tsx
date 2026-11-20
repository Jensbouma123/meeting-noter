'use client';

import { Check, Settings } from 'lucide-react';
import { DropdownMenuItem } from '@jensbouma123/acciva-ui';
import { AssistantLogo } from '@/components/settings/AssistantLogo';
import { ASSISTANT_NAMES } from '@/components/settings/AssistantNames';
import { storeLastAssistant } from '@/lib/ask-assistant/lastAssistantStore';
import { useT } from '@/lib/i18n/useT';
import { AskMenuRow } from './AskMenuRow';
import type { AskAssistantPickerProps } from './AskAssistantPicker.types';

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
  return configuredIds.map((id) => {
    const selected = id === assistantId;
    return (
      <DropdownMenuItem
        key={id}
        icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
        aria-current={selected ? 'true' : undefined}
        onClick={() => storeLastAssistant(id)}
      >
        <span className="inline-flex items-center gap-2">
          <AssistantLogo id={id} size={16} />
          {ASSISTANT_NAMES[id]}
        </span>
      </DropdownMenuItem>
    );
  });
}
