import * as realMeeting from '@/lib/meeting';
import * as mockMeeting from '@/dev/mock-meeting';
import type {
  CaptureMode,
  LanguageInfo,
  Levels,
  MeetingState,
  Segment,
  Source,
  Speaker,
  StartOpts,
  Status,
  SystemVia,
} from '@/lib/meeting';

export type {
  CaptureMode,
  LanguageInfo,
  Levels,
  MeetingState,
  Segment,
  Source,
  Speaker,
  StartOpts,
  Status,
  SystemVia,
};

function checkIsMock(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK === '1') return true;
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('mock') === '1') return true;
      if (urlParams.get('demo') === '1') return true;
      if (localStorage.getItem('mn.mock') === '1') return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function useMeeting<T>(selector: (s: MeetingState) => T): T {
  const isMock = checkIsMock();
  const activeUseMeeting = isMock ? mockMeeting.useMeeting : realMeeting.useMeeting;
  return activeUseMeeting(selector);
}

export const meeting = {
  start(opts: StartOpts): Promise<void> {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    return activeMeeting.start(opts);
  },
  stop(): Promise<void> {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    return activeMeeting.stop();
  },
  release(): Promise<void> {
    const isMock = checkIsMock();
    return isMock ? mockMeeting.meeting.stop() : realMeeting.meeting.release();
  },
  pause(): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.pause();
  },
  resume(): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.resume();
  },
  renameSpeaker(id: string, label: string): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.renameSpeaker(id, label);
  },
  fixWord(heard: string, word: string): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.fixWord(heard, word);
  },
  setLanguage(code: string): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.setLanguage(code);
  },
  enableBrowserASR(): void {
    const isMock = checkIsMock();
    if (isMock) return;
    realMeeting.enableBrowserASR?.();
  },
  disableBrowserASR(): void {
    const isMock = checkIsMock();
    if (isMock) return;
    realMeeting.disableBrowserASR?.();
  },

  subscribeLevels(cb: (l: Levels) => void): () => void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    return activeMeeting.subscribeLevels(cb);
  },
  listMicDevices(): Promise<MediaDeviceInfo[]> {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    return activeMeeting.listMicDevices();
  },
};
