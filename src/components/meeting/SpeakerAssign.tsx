'use client';

import { useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from '@jensbouma123/acciva-ui';
import { Check, ChevronDown } from 'lucide-react';
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

/**
 * "Who is this?" for one speaker: pick one of the meeting's participants (one
 * click renames all of that speaker's lines), type "Someone else" (also added
 * to the participants), or clear the name again. Nothing is guessed.
 */
export function SpeakerAssign({
  sessionId,
  speakerId,
  label,
  source,
  otherLabels,
  className,
  textClassName,
}: {
  sessionId: string;
  speakerId: string;
  label: string;
  source: 'mic' | 'system';
  /** Labels the other speakers carry, to tell which participants are still free. */
  otherLabels: string[];
  className?: string;
  textClassName?: string;
}) {
  const t = useT('participants');
  const tt = useT('transcript');
  const participants = useParticipants(sessionId);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const unnamed = isUnnamedSpeakerLabel(label);
  const free = new Set(unassignedParticipants(participants, otherLabels).map((n) => n.toLowerCase()));

  const assign = (name: string) => {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (!clean) return;
    meeting.renameSpeaker(speakerId, clean);
    addNameToVocabulary(clean);
    if (!participants.some((p) => p.toLowerCase() === clean.toLowerCase())) {
      setParticipants(sessionId, [...participants, clean]);
    }
    setTyping(false);
    setDraft('');
  };
  const clear = () => meeting.renameSpeaker(speakerId, defaultSpeakerLabel(speakerId, source, tt('you')));

  if (typing) {
    return (
      <Input
        size="xs"
        autoFocus
        value={draft}
        maxLength={40}
        aria-label={t('someoneElse')}
        placeholder={t('someoneElsePlaceholder')}
        className="w-40"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => (draft.trim() ? assign(draft) : setTyping(false))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') assign(draft);
          if (e.key === 'Escape') setTyping(false);
        }}
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          data-testid="speaker-assign"
          aria-label={unnamed ? `${t('whoIsThis')} (${label})` : `${t('change')}: ${label}`}
          trailingIcon={<ChevronDown className="size-3 opacity-60" aria-hidden="true" />}
          className={className}
        >
          <span className={`truncate ${textClassName ?? ''}`}>{unnamed ? t('whoIsThis') : label}</span>
        </Button>
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
        <DropdownMenuItem onClick={() => setTyping(true)}>{t('someoneElse')}</DropdownMenuItem>
        {!unnamed && <DropdownMenuItem onClick={clear}>{t('clearName')}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
