import type { Segment } from '@/lib/meeting/types';

export interface MeetingAsr {
  pushLiveAudio: (s: 'mic' | 'system', f: ArrayBuffer) => void;
  flushLiveAudio: () => Promise<unknown>;
}

export interface MeetingStore {
  resetSession: (m: 'both') => void;
  getState: () => { segments: Segment[] };
}
