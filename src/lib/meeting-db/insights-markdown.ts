import { formatClock, resolveSpeakerLabel, tidyText } from '../meeting/transcript-format';
import type { Insight } from '../semantic-search/insights/types/insight';
import type { StoredMeeting } from './types';

export function pendingInsights(meeting: StoredMeeting): Insight[] {
  const set = meeting.insights;
  if (!set) return [];
  const taken = new Set([
    ...meeting.notes.decisions.map((d) => `decision:${d.sourceSegmentId}`),
    ...meeting.notes.actions.map((a) => `action:${a.sourceSegmentId}`),
  ]);
  return set.items.filter((i) => !set.dismissed.includes(i.id) && !taken.has(`${i.kind}:${i.segmentId}`));
}

function line(meeting: StoredMeeting, item: Insight): string {
  const seg = meeting.segments.find((s) => s.id === item.segmentId);
  const who = seg ? resolveSpeakerLabel({ ...seg, final: true }, meeting.speakers) : item.speakerId;
  return `- "${tidyText(item.text)}" (${formatClock(item.start)}, ${who})`;
}

export function insightsMarkdown(meeting: StoredMeeting): string[] {
  const pending = pendingInsights(meeting);
  const out: string[] = [];
  for (const [kind, title] of [['decision', 'Suggested decisions'], ['action', 'Suggested action items']] as const) {
    const items = pending.filter((i) => i.kind === kind);
    if (items.length > 0) out.push(`### ${title} (auto-detected, unconfirmed)`, '', ...items.map((i) => line(meeting, i)), '');
  }
  return out;
}
