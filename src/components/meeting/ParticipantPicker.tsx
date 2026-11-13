'use client';

import { useId, useState } from 'react';
import { Input } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { ParticipantOptionList } from './ParticipantOptionList';
import { pickerSections } from './participantPickerOptions';
import type { ParticipantOption } from './ParticipantOption.types';
import type { ParticipantPickerProps } from './ParticipantPicker.types';

export function ParticipantPicker({ people, roster, folderName, selected, onToggle, onCreate }: ParticipantPickerProps) {
  const t = useT('participants');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const { usual, others, fresh } = pickerSections(people, folderName ? roster : [], query);
  const flat: ParticipantOption[] = [...usual, ...others, ...(fresh ? [{ name: fresh, addNew: true }] : [])];
  const listLabel = t('pickerLabel');
  const usualLabel = folderName ? t('usualPeople').replace('{folder}', folderName) : t('allPeople');

  const pick = (index: number) => {
    const option = flat[index];
    if (!option) return;
    setActiveIndex(index);
    if (option.addNew) {
      addNew(option.name);
      return;
    }
    onToggle(option.name);
  };
  const addNew = (name: string) => {
    onCreate(name);
    setQuery('');
  };
  const move = (delta: number) => {
    if (flat.length === 0) return;
    setHidden(false);
    setActiveIndex((current) =>
      current < 0 ? (delta > 0 ? 0 : flat.length - 1) : (current + delta + flat.length) % flat.length,
    );
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <Input
        type="search"
        role="combobox"
        aria-label={t('searchLabel')}
        aria-autocomplete="list"
        aria-expanded={!hidden}
        aria-controls={listId}
        aria-activedescendant={!hidden && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        placeholder={t('searchPlaceholder')}
        value={query}
        autoComplete="off"
        onFocus={() => setHidden(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setHidden(false);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            move(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            move(-1);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setHidden(true);
            setQuery('');
            setActiveIndex(-1);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (activeIndex >= 0) pick(activeIndex);
            else if (fresh) pick(flat.length - 1);
            else if (query.trim()) pick(0);
          } else if (event.key === ' ' && activeIndex >= 0 && !hidden) {
            event.preventDefault();
            pick(activeIndex);
          }
        }}
      />
      {!hidden && (
        <ParticipantOptionList
          listId={listId}
          usual={usual}
          others={others}
          fresh={fresh}
          usualLabel={usualLabel}
          othersLabel={t('allPeople')}
          emptyLabel={t('noPeople')}
          listLabel={listLabel}
          addLabel={t('addOption')}
          selected={new Set(selected.map((name) => name.toLowerCase()))}
          activeIndex={activeIndex}
          onToggle={onToggle}
          onCreate={addNew}
          onHover={setActiveIndex}
        />
      )}
    </div>
  );
}
