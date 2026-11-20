'use client';

import { DropdownMenuLabel, DropdownMenuSeparator } from '@jensbouma123/acciva-ui';
import type { AskAssistantMenuLayoutProps } from './AskAssistantMenuLayout.types';

export function AskAssistantMenuLayout({
  twoColumn,
  assistantHeading,
  promptHeading,
  assistantSlot,
  promptSlot,
}: AskAssistantMenuLayoutProps) {
  if (!twoColumn) {
    return (
      <div data-layout="stacked">
        <DropdownMenuLabel>{assistantHeading}</DropdownMenuLabel>
        {assistantSlot}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{promptHeading}</DropdownMenuLabel>
        {promptSlot}
      </div>
    );
  }
  return (
    <div data-layout="two-column" className="grid grid-cols-[15rem_minmax(0,1fr)] gap-x-2">
      <div data-column="assistant" className="min-w-0 pr-1">
        <DropdownMenuLabel>{assistantHeading}</DropdownMenuLabel>
        {assistantSlot}
      </div>
      <div data-column="prompts" className="min-w-0 border-l border-border/70 pl-2">
        <DropdownMenuLabel>{promptHeading}</DropdownMenuLabel>
        {promptSlot}
      </div>
    </div>
  );
}
