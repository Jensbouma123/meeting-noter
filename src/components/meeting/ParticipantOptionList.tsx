'use client';

import { Check, Plus } from 'lucide-react';
import type { ParticipantOption } from './ParticipantOption.types';
import type { ParticipantOptionListProps } from './ParticipantOptionList.types';

const ROW = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-sm';
const CHECKED = 'border-primary-500 bg-primary-500 text-on-primary';
const UNCHECKED = 'border-border-subtle';

export function ParticipantOptionList(props: ParticipantOptionListProps) {
  const { listId, usual, others, fresh, usualLabel, othersLabel, emptyLabel, listLabel } = props;
  const { addLabel, selected, activeIndex, onToggle, onCreate, onHover } = props;
  const freshIndex = usual.length + others.length;
  const renderRow = (option: ParticipantOption, index: number) => {
    const checked = !option.addNew && selected.has(option.name.toLowerCase());
    return (
      <div
        key={`${option.addNew ? 'new' : 'person'}-${option.name}`}
        id={`${listId}-option-${index}`}
        role="option"
        aria-selected={checked}
        className={`${ROW} ${index === activeIndex ? 'bg-surface-hover' : ''}`}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => onHover(index)}
        onClick={() => (option.addNew ? onCreate(option.name) : onToggle(option.name))}
      >
        {option.addNew ? (
          <Plus className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <span
            aria-hidden="true"
            className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? CHECKED : UNCHECKED}`}
          >
            {checked && <Check className="size-3" />}
          </span>
        )}
        <span className="truncate">{option.addNew ? addLabel.replace('{name}', option.name) : option.name}</span>
      </div>
    );
  };

  return (
    <div
      id={listId}
      role="listbox"
      aria-multiselectable="true"
      aria-label={listLabel}
      className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 w-full flex-col gap-1 overflow-y-auto rounded-md border border-border-subtle bg-surface p-1 shadow-lg"
    >
      {usual.length > 0 && (
        <div role="group" aria-label={usualLabel}>
          <div aria-hidden="true" className="px-2 py-1 text-xs font-semibold text-muted-foreground">{usualLabel}</div>
          {usual.map((option, index) => renderRow(option, index))}
        </div>
      )}
      {(others.length > 0 || fresh) && (
        <div role="group" aria-label={othersLabel}>
          {usual.length > 0 && (
            <div aria-hidden="true" className="px-2 py-1 text-xs font-semibold text-muted-foreground">{othersLabel}</div>
          )}
          {others.map((option, index) => renderRow(option, usual.length + index))}
          {fresh && renderRow({ name: fresh, addNew: true }, freshIndex)}
        </div>
      )}
      {usual.length === 0 && others.length === 0 && !fresh && (
        <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
