'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@jensbouma123/acciva-ui';
import { useT } from '@/lib/i18n/useT';
import { ParticipantOptionList } from './ParticipantOptionList';
import { pickerSections } from './participantPickerOptions';
import type { ParticipantOption } from './ParticipantOption.types';
import type { ParticipantPickerProps } from './ParticipantPicker.types';

export function ParticipantPicker({
  people,
  roster,
  folderName,
  selected,
  onToggle,
  onCreate,
  placement = 'overlay',
}: ParticipantPickerProps) {
  const t = useT('participants');
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [keyboardActive, setKeyboardActive] = useState(false);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
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
    setKeyboardActive(true);
    setActiveIndex((current) =>
      current < 0 ? (delta > 0 ? 0 : flat.length - 1) : (current + delta + flat.length) % flat.length,
    );
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const enter = () => {
      if (activeIndex >= 0) pick(activeIndex);
      else if (fresh) pick(flat.length - 1);
      else if (query.trim()) pick(0);
    };
    const space = keyboardActive && activeIndex >= 0 && !hidden;
    if (event.key === ' ' && !space) return;
    const handlers: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Escape: () => {
        setHidden(true);
        setQuery('');
        setActiveIndex(-1);
      },
      Enter: enter,
      ' ': () => pick(activeIndex),
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  };

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setHidden(true);
      }}
    >
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
          setKeyboardActive(false);
        }}
        onKeyDown={handleKeyDown}
      />
      {!hidden && (
        <ParticipantOptionList
          listId={listId}
          placement={placement}
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
          onHover={(index) => {
            setKeyboardActive(false);
            setActiveIndex(index);
          }}
        />
      )}
    </div>
  );
}
