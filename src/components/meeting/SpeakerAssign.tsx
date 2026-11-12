'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '@jensbouma123/acciva-ui';
import { Check, ChevronDown, UserPlus } from 'lucide-react';
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
 * to the participants), edit or clear the name again. Nothing is guessed.
 *
 * `appearance="rail"` is the compact trigger used in the right rail's
 * Participants tab; `inline` (default) is the transcript's speaker label.
 */
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
}: {
  sessionId: string;
  speakerId: string;
  label: string;
  source: 'mic' | 'system';
  /** Labels the other speakers carry, to tell which participants are still free. */
  otherLabels: string[];
  className?: string;
  textClassName?: string;
  appearance?: 'inline' | 'rail';
  /** Called with how many names were newly added to the vocabulary. */
  onAssigned?: (addedToVocab: number) => void;
}) {
  const t = useT('participants');
  const tt = useT('transcript');
  const participants = useParticipants(sessionId);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const nameRef = useRef<HTMLSpanElement>(null);
  const [nameTruncated, setNameTruncated] = useState(false);
  const unnamed = isUnnamedSpeakerLabel(label);
  const rail = appearance === 'rail';
  const free = new Set(unassignedParticipants(participants, otherLabels).map((n) => n.toLowerCase()));

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;
    const measure = () => setNameTruncated(element.scrollWidth > element.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label, rail]);

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

  const trigger = rail ? (
    unnamed ? (
      <Button
        type="button"
        variant="outline"
        size="xs"
        data-testid="speaker-assign"
        aria-label={`${t('whoIsThis')} (${label})`}
        leadingIcon={<UserPlus className="size-3.5" aria-hidden="true" />}
        trailingIcon={<ChevronDown className="size-3 opacity-60" aria-hidden="true" />}
        className="text-foreground"
      >
        {t('whoIsThis')}
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        data-testid="speaker-assign"
        aria-label={`${t('change')}: ${label}`}
        trailingIcon={<ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />}
        className="-ml-1.5 min-w-0 w-full max-w-none flex-1 justify-start px-1.5"
      >
        <span ref={nameRef} title={nameTruncated ? label : undefined} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">{label}</span>
      </Button>
    )
  ) : (
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
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger>{trigger}</DropdownMenuTrigger>
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
  // acciva-ui's DropdownMenu wraps the trigger in `div.relative.inline-block`
  // (not styleable), which shrink-wraps the button so `w-full` has nothing to
  // fill. In the rail, force that wrapper to a full-width block.
  return rail && !unnamed ? (
    <div data-testid="speaker-assign-wrap" className="min-w-0 w-full [&>div]:block [&>div]:w-full">
      {menu}
    </div>
  ) : (
    menu
  );
}
