'use client';

import { useState } from 'react';
import { Button, HStack, Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { Plus, X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { parseParticipantNames, uniqueNames } from '@/lib/meeting/participants';

export const CHIP_CLASS =
  'inline-flex min-h-8 items-center gap-1 rounded-full border border-border-subtle bg-surface px-3 text-sm text-foreground';

/**
 * Chips for the people in a meeting, one add field (Enter adds, commas split)
 * and recently used names as one-click suggestions. Controlled: the owner
 * decides when the list is saved.
 */
export function ParticipantsEditor({
  id,
  names,
  suggestions,
  onChange,
  onEmptyEnter,
}: {
  id: string;
  names: string[];
  suggestions: string[];
  onChange: (names: string[]) => void;
  /** Enter pressed in an empty field (the dialog uses it to start). */
  onEmptyEnter?: () => void;
}) {
  const t = useT('participants');
  const [draft, setDraft] = useState('');

  const add = (incoming: string[]) => {
    if (incoming.length > 0) onChange(uniqueNames([...names, ...incoming]));
  };
  const commitDraft = () => {
    add(parseParticipantNames(draft));
    setDraft('');
  };
  const taken = new Set(names.map((n) => n.toLowerCase()));
  const open = suggestions.filter((n) => !taken.has(n.toLowerCase()));

  return (
    <VStack spacing="sm" className="w-full">
      {names.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('listLabel')}>
          {names.map((name) => (
            <li key={name} className={CHIP_CLASS}>
              <span className="max-w-48 truncate">{name}</span>
              <button
                type="button"
                className="touch-target-44 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t('remove').replace('{name}', name)}
                onClick={() => onChange(names.filter((n) => n !== name))}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <HStack spacing="sm" className="w-full">
        <div className="min-w-0 flex-1">
          <Input
            id={id}
            aria-label={t('addLabel')}
            placeholder={t('placeholder')}
            value={draft}
            autoComplete="off"
            onChange={(e) => {
              const value = e.target.value;
              if (value.includes(',')) {
                const parts = value.split(',');
                const rest = parts.pop() ?? '';
                add(parseParticipantNames(parts.join(',')));
                setDraft(rest);
              } else {
                setDraft(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (draft.trim()) commitDraft();
              else onEmptyEnter?.();
            }}
          />
        </div>
        <Button
          variant="outline"
          size={{ base: 'md', md: 'sm' }}
          leadingIcon={<Plus className="size-3.5" aria-hidden="true" />}
          disabled={draft.trim().length === 0}
          onClick={commitDraft}
        >
          {t('add')}
        </Button>
      </HStack>
      {open.length > 0 && (
        <VStack spacing="xs" className="w-full">
          <Text size="xs" variant="muted">
            {t('recent')}
          </Text>
          <div className="flex flex-wrap gap-2">
            {open.map((name) => (
              <button
                key={name}
                type="button"
                className={`${CHIP_CLASS} border-dashed hover:bg-surface-hover`}
                onClick={() => add([name])}
              >
                <Plus className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {name}
              </button>
            ))}
          </div>
        </VStack>
      )}
    </VStack>
  );
}
