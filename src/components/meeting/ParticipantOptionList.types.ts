import type { ParticipantOption } from './ParticipantOption.types';

export interface ParticipantOptionListProps {
  listId: string;
  usual: ParticipantOption[];
  others: ParticipantOption[];
  fresh: string | null;
  usualLabel: string;
  othersLabel: string;
  emptyLabel: string;
  listLabel: string;
  addLabel: string;
  selected: ReadonlySet<string>;
  activeIndex: number;
  onToggle: (name: string) => void;
  onCreate: (name: string) => void;
  onHover: (index: number) => void;
}
