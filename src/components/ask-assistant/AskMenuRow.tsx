'use client';

import { DropdownMenuItem } from '@jensbouma123/acciva-ui';
import type { AskMenuRowProps } from './AskMenuRow.types';

export function AskMenuRow({ icon, title, hint, disabled, onClick }: AskMenuRowProps) {
  return (
    <DropdownMenuItem
      icon={icon}
      disabled={disabled}
      onClick={onClick}
      className="items-start gap-3 py-2.5 [&>span:first-child]:mt-0.5"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
      </span>
    </DropdownMenuItem>
  );
}
