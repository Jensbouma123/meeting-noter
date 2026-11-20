'use client';

import { Check, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@jensbouma123/acciva-ui';
import { ASK_ASSISTANTS, ASK_PRESET_IDS } from '@/lib/ask-assistant';
import { storeLastAssistant } from '@/lib/ask-assistant/lastAssistantStore';
import { useT } from '@/lib/i18n/useT';
import { AssistantLogo } from './AssistantLogo';
import { SEGMENT_CLASS } from './askAssistantStyles';
import type { AskAssistantMenuProps } from './AskAssistantMenu.types';

const MENU_GAP_PX = 8;

export function AskAssistantMenu({ assistantId, hasTranscript, onPreset, onCustom }: AskAssistantMenuProps) {
  const t = useT('ask');
  const presetLabels = {
    summary: t('preset.summary'),
    decisions: t('preset.decisions'),
    actions: t('preset.actions'),
    all: t('preset.all'),
    cleanup: t('preset.cleanup'),
  };
  const label = t('moreOptions');

  return (
    <DropdownMenu>
      <Tooltip content={label}>
        <span className="inline-flex">
          <DropdownMenuTrigger>
            <button type="button" aria-label={label} className={`${SEGMENT_CLASS} rounded-r-full pr-3 pl-2`}>
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
        </span>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={MENU_GAP_PX} className="mic-menu max-w-80">
        <DropdownMenuLabel>{t('promptHeading')}</DropdownMenuLabel>
        {ASK_PRESET_IDS.map((preset) => (
          <DropdownMenuItem key={preset} disabled={!hasTranscript} onClick={() => onPreset(preset)}>
            {presetLabels[preset]}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem disabled={!hasTranscript} onClick={onCustom}>
          {t('custom')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('assistantHeading')}</DropdownMenuLabel>
        {ASK_ASSISTANTS.map((assistant) => {
          const selected = assistant.id === assistantId;
          return (
            <DropdownMenuItem
              key={assistant.id}
              icon={selected ? <Check className="size-4" /> : <span className="size-4" />}
              aria-current={selected ? 'true' : undefined}
              onClick={() => storeLastAssistant(assistant.id)}
            >
              <span className="inline-flex items-center gap-2">
                <AssistantLogo id={assistant.id} className="size-4" />
                {assistant.name}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
