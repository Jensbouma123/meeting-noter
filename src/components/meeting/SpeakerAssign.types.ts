export interface SpeakerAssignProps {
  sessionId: string;
  speakerId: string;
  label: string;
  source: 'mic' | 'system';
  otherLabels: string[];
  className?: string;
  textClassName?: string;
  appearance?: 'inline' | 'rail';
  onAssigned?: (addedToVocab: number) => void;
}
