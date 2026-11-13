import { useUpdate } from '@/components/update/useUpdate';
import { useServerHeartbeat } from '@/lib/lifecycle/useServerHeartbeat';

export function useUpdateAvailable(isRecording: boolean): boolean {
  const update = useUpdate(isRecording);
  useServerHeartbeat(isRecording);
  return update.status === 'available' && update.info?.latest !== update.dismissedVersion;
}
