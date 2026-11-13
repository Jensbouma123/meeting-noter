'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@jensbouma123/acciva-ui';
import { Check } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import {
  defaultSpeakerLabel,
  isUnnamedSpeakerLabel,
  setParticipants,
  unassignedParticipants,
  useParticipants,
} from '@/lib/meeting/participants';
import { addNameToVocabulary } from '@/lib/vocabulary/names';
import { meeting } from './store';
import { renderSpeakerAssignTrigger } from './renderSpeakerAssignTrigger';
import { useNameTruncation } from './useNameTruncation';
import type { SpeakerAssignProps } from './SpeakerAssign.types';

export function SpeakerAssign({
  sessionId,
  speakerId,
  label,
  source,
  otherLabels,
  className,
  textClassName,
  appearance = 'inline',
  onAssigned,
}: SpeakerAssignProps) {
  const t = useT('participants');
  const tt = useT('transcript');
  const participants = useParticipants(sessionId);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const unnamed = isUnnamedSpeakerLabel(label);
  const rail = appearance === 'rail';
  const { nameRef, nameTruncated } = useNameTruncation(label, rail);
  const free = new Set(unassignedParticipants(participants, otherLabels).map((n) => n.toLowerCase()));

  const assign = (name: string) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    meeting.renameSpeaker(speakerId, clean);
    const added = addNameToVocabulary(clean);
    onAssigned?.(added);
    if (!participants.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      setParticipants(sessionId, [...participants, clean]);
    }
    setTyping(false);
    setDraft('');
  };
  const clear = () => meeting.renameSpeaker(speakerId, defaultSpeakerLabel(speakerId, source, tt('you')));
  const edit = () => {
    setDraft(label);
    setTyping(true);
  };

  if (typing) {
    return (
      <Input
        size="xs"
        autoFocus
        value={draft}
        maxLength={40}
        aria-label={t('someoneElse')}
        placeholder={t('someoneElsePlaceholder')}
        className={rail ? 'w-full' : 'w-40'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => (draft.trim() ? assign(draft) : setTyping(false))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') assign(draft);
          if (e.key === 'Escape') setTyping(false);
        }}
      />
    );
  }

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger>
        {renderSpeakerAssignTrigger({
          t,
          rail,
          unnamed,
          label,
          className,
          textClassName,
          nameRef,
          nameTruncated,
        })}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {participants.map((name) => (
          <DropdownMenuItem key={name} onClick={() => assign(name)}>
            <span className="flex w-full items-center justify-between gap-3">
              {name}
              {name.toLowerCase() === label.toLowerCase() ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : free.has(name.toLowerCase()) ? (
                <span className="text-xs text-muted-foreground">{t('notAssigned')}</span>
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
        {participants.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => setTyping(true)}>{t('someoneElse')}</DropdownMenuItem>
        {!unnamed && <DropdownMenuItem onClick={edit}>{t('editName')}</DropdownMenuItem>}
        {!unnamed && <DropdownMenuItem onClick={clear}>{t('clearName')}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return rail && !unnamed ? (
    <div data-testid="speaker-assign-wrap" className="min-w-0 w-full [&>div]:block [&>div]:w-full">
      {menu}
    </div>
  ) : (
    menu
  );
}
