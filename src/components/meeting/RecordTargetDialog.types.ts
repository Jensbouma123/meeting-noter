export interface RecordTargetDialogProps {
  open: boolean;
  title: string;
  durationSeconds: number;
  onCancel: () => void;
  onAppend: () => void;
  onStartNew: () => void;
}
