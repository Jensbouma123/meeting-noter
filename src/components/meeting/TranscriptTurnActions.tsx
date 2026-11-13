import { useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import type { AddedNoteKind, TranscriptTurnActionsProps } from './TranscriptTurnActions.types';

export function TranscriptTurnActions({ actions }: TranscriptTurnActionsProps) {
  const t = useT('transcript');
  const [added, setAdded] = useState<AddedNoteKind | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`ml-auto flex shrink-0 items-center gap-1 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
        menuOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span role="status" aria-live="polite" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        {added && (
          <>
            <Check aria-hidden="true" className="size-3.5" />
            {added === 'action' ? t('actionAdded') : t('decisionAdded')}
          </>
        )}
      </span>
      <DropdownMenu onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            tooltip={t('lineActions')}
            aria-label={t('lineActions')}
            leadingIcon={<MoreHorizontal className="size-4" />}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => { actions.createAction(); setAdded('action'); }}>
            {t('createAction')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { actions.markDecision(); setAdded('decision'); }}>
            {t('markDecision')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
