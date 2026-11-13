import type { MeetingDiagnostics } from '@/lib/meeting';

export interface CaptureSourceReadoutProps {
  source: 'mic' | 'system';
  diag: MeetingDiagnostics;
}
