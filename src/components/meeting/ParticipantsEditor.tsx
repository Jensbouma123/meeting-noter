'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { Input, Text, VStack } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { parseParticipantNames, uniqueNames } from '@/lib/meeting/participant-names';
import { useVocabulary } from '@/lib/vocabulary/store';
import { ParticipantChips } from './ParticipantChips';
import { ParticipantMenu } from './ParticipantMenu';
import { buildParticipantOptions } from './participantOptions';
import type { ParticipantsEditorProps } from './ParticipantsEditor.types';

export function ParticipantsEditor({
  id,
  names,
  suggestions,
  onChange,
  onEmptyEnter,
  compact = false,
}: ParticipantsEditorProps) {
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
  const { options, matches } = buildParticipantOptions(
    names,
    [...suggestions, ...entries.filter((entry) => entry.source === 'meeting').map((entry) => entry.word)],
    draft,
  );
  const menuOpen = focused && options.length > 0;
  const select = (name: string) => {
    add([name]);
    setDraft('');
    setActiveIndex(-1);
  };

  const handleDraftChange = (value: string) => {
    if (!value.includes(',')) {
      setDraft(value);
    } else {
      const parts = value.split(',');
      const rest = parts.pop() ?? '';
      add(parseParticipantNames(parts.join(',')));
      setDraft(rest);
    }
    setActiveIndex(-1);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const count = options.length;
    if (e.key === 'ArrowDown' && count > 0) {
      e.preventDefault();
      setActiveIndex((current) => (current + 1) % count);
      return;
    }
    if (e.key === 'ArrowUp' && count > 0) {
      e.preventDefault();
      setActiveIndex((current) => (current < 0 ? count - 1 : (current - 1 + count) % count));
      return;
    }
    if (e.key === 'Escape') {
      setFocused(false);
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!draft.trim()) onEmptyEnter?.();
    else if (count > 0) select(options[activeIndex]?.name ?? options[0].name);
    else commitDraft();
  };

  return (
    <VStack spacing="sm" className="w-full">
      {names.length > 0 && <ParticipantChips names={names} compact={compact} onChange={onChange} />}
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
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {menuOpen && (
          <ParticipantMenu
            listId={listId}
            options={options}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={select}
          />
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
