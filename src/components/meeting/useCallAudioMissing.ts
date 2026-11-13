import { useSyncExternalStore } from 'react';
import { getCallAudioMissing, subscribeCallAudio } from '@/lib/meeting';

function getCallAudioMissingServerSnapshot(): boolean {
  return false;
}

export function useCallAudioMissing(): boolean {
  return useSyncExternalStore(subscribeCallAudio, getCallAudioMissing, getCallAudioMissingServerSnapshot);
}
