import type { MeetingSummaryRow } from '../lib/meeting-db/types';

export function toListItem(m: MeetingSummaryRow) {
  return {
    id: m.id,
    title: m.title,
    date: new Date(m.startedAt ?? m.createdAt).toISOString(),
    durationSeconds: m.durationSeconds,
    speakers: m.speakers,
    lines: m.segmentCount,
  };
}
