import { useBannerState } from '@/components/UpdateBanner.state';
import { useServerHeartbeat } from '@/lib/lifecycle/useServerHeartbeat';

export function useUpdateAvailable(isRecording: boolean): boolean {
  const { info } = useBannerState(isRecording);
  useServerHeartbeat(isRecording);
  return info !== null;
}
