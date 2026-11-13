import type { CaptureMode, SystemVia } from '@/lib/meeting';
import type { RetentionChoice } from '@/lib/meeting/types/retention';

export interface AppSettings {
  mode: CaptureMode;
  systemVia: SystemVia;
  micDeviceId: string;
  language: string;
  autoScroll: boolean;
  retention: RetentionChoice;
  ownerName: string;
}
