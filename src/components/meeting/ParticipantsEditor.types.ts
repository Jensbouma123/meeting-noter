export interface ParticipantsEditorProps {
  id: string;
  names: string[];
  suggestions: string[];
  onChange: (names: string[]) => void;
  onEmptyEnter?: () => void;
  compact?: boolean;
}

export interface ParticipantOption {
  name: string;
  addNew: boolean;
}

export interface ParticipantChipsProps {
  names: string[];
  compact: boolean;
  onChange: (names: string[]) => void;
}

export interface ParticipantMenuProps {
  listId: string;
  options: ParticipantOption[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (name: string) => void;
}
