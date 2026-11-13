'use client';

import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import type { ParticipantChipsProps } from './ParticipantsEditor.types';

const CHIP_CLASS =
  'inline-flex min-h-8 items-center gap-1 rounded-full border border-border-subtle bg-surface px-3 text-sm text-foreground';

const COMPACT_CHIP_CLASS =
  'inline-flex min-h-7 items-center gap-1 rounded-full border border-border-subtle bg-surface pl-2.5 pr-1 text-xs text-foreground';

export function ParticipantChips({ names, compact, onChange }: ParticipantChipsProps) {
  const t = useT('participants');
  return (
    <ul
      className={`m-0 flex list-none flex-wrap p-0 ${compact ? 'gap-1.5' : 'gap-2'}`}
      aria-label={t('listLabel')}
    >
      {names.map((name) => (
        <li key={name} className={compact ? COMPACT_CHIP_CLASS : CHIP_CLASS}>
          <span className={`${compact ? 'max-w-36' : 'max-w-48'} truncate`} title={compact ? name : undefined}>
            {name}
          </span>
          <button
            type="button"
            className="focus-ring touch-target-44 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label={t('remove').replace('{name}', name)}
            onClick={() => onChange(names.filter((n) => n !== name))}
          >
            <X className={compact ? 'size-3' : 'size-3.5'} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
