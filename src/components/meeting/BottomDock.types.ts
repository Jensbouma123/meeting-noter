import type { CaptureMode, Status } from '@/lib/meeting';
import type { ModelProgressView, ModelReadiness } from './modelReadiness.types';

export interface BottomDockProps {
  status: Status;
  mode: CaptureMode;
  modelReadiness: ModelReadiness;
  modelProgress: ModelProgressView;
  onModeChange: (newMode: CaptureMode) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onOpenAdvanced: () => void;
  micDeviceId?: string;
  onMicDeviceChange?: (deviceId: string) => void;
}
