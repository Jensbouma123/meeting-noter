import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@jensbouma123/acciva-ui';
import { Check, User } from 'lucide-react';
import { updateAction } from '@/lib/meeting/notes';
import { CHIP } from './constants';
import type { ActionOwnerChipProps } from './ActionOwnerChip.types';

export function ActionOwnerChip({ item, speakers, t, sessionId }: ActionOwnerChipProps) {
  const ownerLabel = item.ownerName ?? speakers.find((speaker) => speaker.id === item.ownerSpeakerId)?.label;
  const tick = (selected: boolean) =>
    selected ? <Check aria-hidden="true" className="size-4" /> : <span className="size-4" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button type="button" className={CHIP} aria-label={`${t('owner')}: ${ownerLabel ?? t('noOwner')}`}>
          <User aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{ownerLabel ?? t('owner')}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          icon={tick(!item.ownerSpeakerId && !item.ownerName)}
          onClick={() => updateAction(sessionId, item.id, { ownerSpeakerId: undefined, ownerName: undefined })}
        >
          {t('noOwner')}
        </DropdownMenuItem>
        {speakers.map((speaker) => (
          <DropdownMenuItem
            key={speaker.id}
            icon={tick(item.ownerSpeakerId === speaker.id)}
            onClick={() => updateAction(sessionId, item.id, { ownerSpeakerId: speaker.id, ownerName: speaker.label })}
          >
            {speaker.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
