import type { useMeetingViewState } from '../hooks/useMeetingViewState';

export type MeetingViewState = ReturnType<typeof useMeetingViewState>;

export interface MeetingViewLayoutProps {
  state: MeetingViewState;
}
