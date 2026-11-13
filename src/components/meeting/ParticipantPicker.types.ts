export interface ParticipantPickerProps {
  people: string[];
  roster: string[];
  folderName: string | null;
  selected: string[];
  onToggle: (name: string) => void;
  onCreate: (name: string) => void;
}
