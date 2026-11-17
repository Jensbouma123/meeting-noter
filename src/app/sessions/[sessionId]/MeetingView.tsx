'use client';

import { MeetingViewLayout } from './components/MeetingViewLayout';
import { useMeetingViewState } from './hooks/useMeetingViewState';
import type { MeetingViewProps } from './MeetingView.types';

export default function MeetingView({ initialSessionId }: MeetingViewProps) {
  const state = useMeetingViewState(initialSessionId);
  return <MeetingViewLayout state={state} />;
}
