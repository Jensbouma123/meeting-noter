import type { CaptureMode } from '@/lib/meeting';
import type { AudioDrawerState } from './useAudioDrawer.types';

export interface AudioSettingsDrawerProps {
  drawer: AudioDrawerState;
  mode: CaptureMode;
  locked: boolean;
  isLive: boolean;
  micDeviceId: string;
  callMissing: boolean;
  onModeChange: (mode: CaptureMode) => void;
  onMicDeviceChange: (deviceId: string) => void;
}
