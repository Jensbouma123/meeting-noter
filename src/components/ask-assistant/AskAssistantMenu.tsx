'use client';

import { ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@jensbouma123/acciva-ui';
import { loadConfiguredAssistants } from '@/lib/ask-assistant/configuredAssistantsStore';
import { useT } from '@/lib/i18n/useT';
import { AskAssistantPicker } from './AskAssistantPicker';
import { AskPresetRows } from './AskPresetRows';
import { SEGMENT_CLASS } from './askAssistantStyles';
import type { AskAssistantMenuProps } from './AskAssistantMenu.types';

const MENU_GAP_PX = 8;

export function AskAssistantMenu({
  assistantId,
  configuredIds,
  loaded,
  hasTranscript,
  onPreset,
  onCustom,
  onOpenSettings,
}: AskAssistantMenuProps) {
  const t = useT('ask');
  const label = t('moreOptions');

  return (
    <DropdownMenu onOpenChange={(open) => open && void loadConfiguredAssistants()}>
      <Tooltip content={label}>
        <span className="inline-flex">
          <DropdownMenuTrigger>
            <button type="button" aria-label={label} className={`${SEGMENT_CLASS} rounded-r-full pr-3 pl-2`}>
              <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
        </span>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={MENU_GAP_PX}
        className="mic-menu w-80 max-w-[calc(100vw-2rem)] p-1.5"
      >
        <DropdownMenuLabel>{t('promptHeading')}</DropdownMenuLabel>
        <AskPresetRows hasTranscript={hasTranscript && assistantId !== null} onPreset={onPreset} onCustom={onCustom} />
        {loaded && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('assistantHeading')}</DropdownMenuLabel>
            <AskAssistantPicker
              assistantId={assistantId}
              configuredIds={configuredIds}
              onOpenSettings={onOpenSettings}
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
