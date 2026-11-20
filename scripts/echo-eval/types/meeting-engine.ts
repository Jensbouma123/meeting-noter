import type { Segment } from '@/lib/meeting/types';

export interface MeetingAsr {
  pushLiveAudio: (s: 'mic' | 'system', f: ArrayBuffer) => void;
  flushLiveAudio: () => Promise<unknown>;
  route?: (s: 'mic' | 'system', f: ArrayBuffer) => void;
  startSpeakers?: () => Promise<void>;
  settleSpeakers?: () => Promise<void>;
  flushSpeakers?: () => Promise<void>;
}

export interface MeetingStore {
  resetSession: (m: 'both') => void;
  getState: () => { segments: Segment[] };
}
