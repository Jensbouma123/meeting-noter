'use client';

import { useId, useState } from 'react';
import { Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/useT';
import { parseParticipantNames, uniqueNames } from '@/lib/meeting/participants';
import { useVocabulary } from '@/lib/vocabulary/store';

export const CHIP_CLASS =
  'inline-flex min-h-8 items-center gap-1 rounded-full border border-border-subtle bg-surface px-3 text-sm text-foreground';

const COMPACT_CHIP_CLASS =
  'inline-flex min-h-7 items-center gap-1 rounded-full border border-border-subtle bg-surface pl-2.5 pr-1 text-xs text-foreground';

/** People chips and a searchable, keyboard accessible combobox for adding names. */
export function ParticipantsEditor({
  id,
  names,
  suggestions,
  onChange,
  onEmptyEnter,
  compact = false,
}: {
  id: string;
  names: string[];
  suggestions: string[];
  onChange: (names: string[]) => void;
  /** Enter pressed in an empty field (the dialog uses it to start). */
  onEmptyEnter?: () => void;
  compact?: boolean;
}) {
  const t = useT('participants');
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const { entries } = useVocabulary();

  const add = (incoming: string[]) => {
    if (incoming.length > 0) onChange(uniqueNames([...names, ...incoming]));
  };
  const commitDraft = () => {
    add(parseParticipantNames(draft));
    setDraft('');
  };
  const taken = new Set(names.map((n) => n.toLowerCase()));
  const known = uniqueNames([
    ...suggestions,
    ...entries.filter((entry) => entry.source === 'meeting').map((entry) => entry.word),
  ]).filter((name) => !taken.has(name.toLowerCase()));
  const query = draft.trim().toLowerCase();
  const matches = query ? known.filter((name) => name.toLowerCase().includes(query)) : known;
  const exactMatch = query && known.some((name) => name.toLowerCase() === query);
  const options = [
    ...matches.map((name) => ({ name, addNew: false })),
    ...(query && !exactMatch
      ? [{ name: draft.trim().replace(/\s+/g, ' ').slice(0, 40), addNew: true }]
      : []),
  ];
  const menuOpen = focused && options.length > 0;
  const select = (name: string) => {
    add([name]);
    setDraft('');
    setActiveIndex(-1);
  };

  return (
    <VStack spacing="sm" className="w-full">
      {names.length > 0 && (
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
                className="touch-target-44 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label={t('remove').replace('{name}', name)}
                onClick={() => onChange(names.filter((n) => n !== name))}
              >
                <X className={compact ? 'size-3' : 'size-3.5'} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative w-full">
        <Input
          id={id}
          size={compact ? 'sm' : undefined}
          aria-label={t('addLabel')}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={menuOpen}
          aria-controls={listId}
      aria-activedescendant={menuOpen && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
          placeholder={compact ? t('placeholderShort') : t('placeholder')}
          value={draft}
          autoComplete="off"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
            setActiveIndex(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && options.length > 0) {
              e.preventDefault();
              setActiveIndex((current) => (current + 1) % options.length);
            } else if (e.key === 'ArrowUp' && options.length > 0) {
              e.preventDefault();
              setActiveIndex((current) => (current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length));
            } else if (e.key === 'Escape') {
              setFocused(false);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (draft.trim() && options.length > 0) select(options[activeIndex]?.name ?? options[0].name);
              else if (draft.trim()) commitDraft();
              else onEmptyEnter?.();
            }
          }}
        />
        {menuOpen && (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border-subtle bg-surface p-1 shadow-lg"
          >
            {options.map((option, index) => (
              <li
                key={`${option.addNew ? 'add' : 'known'}-${option.name}`}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className={`cursor-pointer rounded px-2 py-1.5 text-sm ${activeIndex === index ? 'bg-surface-hover' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option.name)}
              >
                {option.addNew ? t('addOption').replace('{name}', option.name) : option.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {focused && !draft && matches.length > 0 && (
        <Text size="xs" variant="muted">
          {t('recent')}
        </Text>
      )}
    </VStack>
  );
}
