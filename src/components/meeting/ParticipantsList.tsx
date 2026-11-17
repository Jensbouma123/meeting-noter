'use client';

import { ParticipantChips } from './ParticipantChips';
import { ParticipantPicker } from './ParticipantPicker';
import type { ParticipantsListProps } from './ParticipantsList.types';

export function ParticipantsList({
  people,
  roster,
  folderName,
  selected,
  onChange,
  onCreate,
  placement,
}: ParticipantsListProps) {
  const toggle = (name: string) => {
    const key = name.toLowerCase();
    const exists = selected.some((item) => item.toLowerCase() === key);
    onChange(exists ? selected.filter((item) => item.toLowerCase() !== key) : [...selected, name]);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {selected.length > 0 && <ParticipantChips names={selected} onChange={onChange} />}
      <ParticipantPicker
        people={people}
        roster={roster}
        folderName={folderName}
        selected={selected}
        onToggle={toggle}
        onCreate={onCreate}
        placement={placement}
      />
    </div>
  );
}
