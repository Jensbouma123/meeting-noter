import type { CaptureMode } from '@/lib/meeting';

export interface LevelMeterProps {
  mode: CaptureMode;
  active: boolean;
  callMissing?: boolean;
}
