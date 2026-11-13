'use client';

import { useT } from '@/lib/i18n/useT';
import type { ParticipantMenuProps } from './ParticipantsEditor.types';

export function ParticipantMenu({ listId, options, activeIndex, onHover, onSelect }: ParticipantMenuProps) {
  const t = useT('participants');
  return (
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
          onMouseEnter={() => onHover(index)}
          onClick={() => onSelect(option.name)}
        >
          {option.addNew ? t('addOption').replace('{name}', option.name) : option.name}
        </li>
      ))}
    </ul>
  );
}
