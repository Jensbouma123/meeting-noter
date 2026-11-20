import type { CaptureMode } from '@/lib/meeting';

export interface CaptureModePickerProps {
  mode: CaptureMode;
  locked: boolean;
  onChange: (mode: CaptureMode) => void;
}
