import type { CaptureMode } from '@/lib/meeting';

export interface MicPickerProps {
  value: string;
  onChange: (deviceId: string) => void;
  locked: boolean;
  mode: CaptureMode;
  active: boolean;
  callMissing?: boolean;
}
