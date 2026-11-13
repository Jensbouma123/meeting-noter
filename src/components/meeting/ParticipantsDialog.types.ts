export interface ParticipantsDialogProps {
  ownerName: string;
  initial: string[];
  onSkip: () => void;
  onStart: (names: string[]) => void;
}
