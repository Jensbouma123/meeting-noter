export interface ParticipantsDialogProps {
  ownerName: string;
  initial: string[];
  roster?: string[];
  folderName?: string | null;
  onSkip: () => void;
  onStart: (names: string[], rememberForFolder?: boolean) => void;
}
