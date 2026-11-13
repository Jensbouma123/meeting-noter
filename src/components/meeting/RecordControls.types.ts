export interface RecordControlsProps {
  isStopping: boolean;
  isRecordingActive: boolean;
  isPaused: boolean;
  needsModel: boolean;
  recordDisabled: boolean;
  recordTooltip: string;
  finishingLabel: string;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}
