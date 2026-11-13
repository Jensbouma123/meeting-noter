import type { ReactNode } from 'react';
import { MEETING_MIME } from './constants';
import { draggableProps } from './dragData';

export function DraggableMeeting({ sessionId, children }: { sessionId: string; children: ReactNode }) {
  return <div {...draggableProps(MEETING_MIME, sessionId)}>{children}</div>;
}
