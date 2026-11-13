export interface ParticipantsListProps {
  people: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onCreate: (name: string) => void;
}
