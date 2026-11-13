import type { CaptureMode } from '@/lib/meeting';

export interface InputControlsProps {
  mode: CaptureMode;
  inputsLocked: boolean;
  isLive: boolean;
  micDeviceId: string;
  showCallAudioMissing: boolean;
  callAudioMissingReason: string;
  onModeChange: (newMode: CaptureMode) => void;
  onMicDeviceChange: (deviceId: string) => void;
  onOpenAdvanced: () => void;
}
