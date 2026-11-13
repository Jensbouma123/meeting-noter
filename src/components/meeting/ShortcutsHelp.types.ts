export interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export interface ShortcutEntry {
  keys: string[];
  label: string;
}
