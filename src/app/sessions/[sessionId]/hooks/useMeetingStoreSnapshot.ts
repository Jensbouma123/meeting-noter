import { useMeeting } from '@/components/meeting';

export function useMeetingStoreSnapshot() {
  const status = useMeeting((s) => s.status);
  const startedAt = useMeeting((s) => s.startedAt);
  const segments = useMeeting((s) => s.segments);
  const speakers = useMeeting((s) => s.speakers);
  const stats = useMeeting((s) => s.stats);
  const error = useMeeting((s) => s.error);
  const warning = useMeeting((s) => s.warning);
  const language = useMeeting((s) => s.language);
  const isRecording = status === 'live' || status === 'paused';
  return { status, startedAt, segments, speakers, stats, error, warning, language, isRecording };
}
