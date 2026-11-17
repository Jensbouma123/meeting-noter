import type { ParticipantPlacement } from './ParticipantPlacement.types';

export interface ParticipantsListProps {
  people: string[];
  roster: string[];
  folderName: string | null;
  selected: string[];
  onChange: (names: string[]) => void;
  onCreate: (name: string) => void;
  placement?: ParticipantPlacement;
}
