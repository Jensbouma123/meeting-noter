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
      // Safe fallback
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
  /** End the session because its view is going away; the mock has no tracks to release. */
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
  setLanguage(code: string): void {
    const isMock = checkIsMock();
    const activeMeeting = isMock ? mockMeeting.meeting : realMeeting.meeting;
    activeMeeting.setLanguage(code);
  },
  /** Enable browser-native ASR (parakeet.js) — the only transcription engine; there is no server. */
  enableBrowserASR(): void {
    const isMock = checkIsMock();
    if (isMock) return;
    realMeeting.enableBrowserASR?.();
  },
  /** Disable browser-native ASR. No transcription runs until it's re-enabled. */
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
