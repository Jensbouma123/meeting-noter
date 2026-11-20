export interface CustomQuestionDialogProps {
  open: boolean;
  assistantName: string;
  onClose: () => void;
  onSubmit: (question: string) => void;
}
