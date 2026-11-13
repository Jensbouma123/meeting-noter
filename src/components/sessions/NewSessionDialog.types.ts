export interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (sessionId: string, title: string) => void;
}
