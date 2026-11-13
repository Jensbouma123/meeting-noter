'use client';

import { useParams } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { reportActiveMeeting } from '@/lib/meeting/active-meeting-report';
import { getLiveSessionId, subscribeLiveSession } from '@/lib/meeting/live-session-id';

export function ActiveMeetingReporter() {
  const params = useParams<{ sessionId?: string }>();
  const liveId = useSyncExternalStore(subscribeLiveSession, getLiveSessionId, () => null);
  const meetingId = params?.sessionId ?? liveId;
  const isLive = meetingId !== null && meetingId === liveId;

  useEffect(() => {
    reportActiveMeeting(meetingId, isLive);
  }, [meetingId, isLive]);

  return null;
}
