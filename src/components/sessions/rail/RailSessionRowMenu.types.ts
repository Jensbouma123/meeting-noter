export interface RailSessionRowMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  isActive: boolean;
  locked: boolean;
  suggesting?: boolean;
  onOpen: () => void;
  onMove?: () => void;
  onSuggest?: () => void;
  onClear: () => void;
  onDelete: () => void;
}
