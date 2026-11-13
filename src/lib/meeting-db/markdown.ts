import { formatClock, resolveSpeakerLabel, tidyText } from '../meeting/transcript-format';
import { insightsMarkdown } from './insights-markdown';
import type { Segment } from '../meeting/types';
import type { FolderRow, StoredMeeting, StoredSegment } from './types';

function asSegment(seg: StoredSegment): Segment {
  return { ...seg, final: true };
}

export function speakerLabel(meeting: StoredMeeting, seg: StoredSegment): string {
  return resolveSpeakerLabel(asSegment(seg), meeting.speakers);
}

export function speakerNames(meeting: StoredMeeting): string[] {
  const names: string[] = [];
  for (const seg of meeting.segments.slice().sort((a, b) => a.start - b.start)) {
    const name = speakerLabel(meeting, seg);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function summaryText(meeting: StoredMeeting): string {
  const lines: string[] = [];
  const { decisions, actions } = meeting.notes;
  if (decisions.length > 0) {
    lines.push('Decisions:', ...decisions.map((d) => `- ${d.text}`));
  }
  if (actions.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push(
      'Action items:',
      ...actions.map((a) => {
        const details = [a.ownerName, a.due].filter(Boolean).join(', ');
        return `- [${a.done ? 'x' : ' '}] ${a.text}${details ? ` (${details})` : ''}`;
      }),
    );
  }
  return lines.join('\n');
}

export function searchSummary(meeting: StoredMeeting): string {
  const names = meeting.participants ?? [];
  return [names.length > 0 ? `Participants: ${names.join(', ')}` : '', summaryText(meeting)].filter(Boolean).join('\n');
}

export function transcriptLines(meeting: StoredMeeting): string[] {
  return meeting.segments
    .slice()
    .sort((a, b) => a.start - b.start)
    .filter((seg) => seg.text.trim().length > 0)
    .map((seg) => `[${formatClock(seg.start)}] ${speakerLabel(meeting, seg)}: ${tidyText(seg.text)}`);
}

export function transcriptText(meeting: StoredMeeting): string {
  return transcriptLines(meeting).join('\n');
}

export function meetingDate(meeting: StoredMeeting): string {
  const d = new Date(meeting.startedAt ?? meeting.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function meetingDateTime(meeting: StoredMeeting): string {
  const d = new Date(meeting.startedAt ?? meeting.createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${meetingDate(meeting)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function markdownFileName(meeting: StoredMeeting): string {
  const slug = meeting.title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const id = meeting.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'meeting';
  return `${meetingDate(meeting)}-${slug || 'meeting'}-${id}.md`;
}

export function markdownFolderPath(folders: FolderRow[], folderId: string | null | undefined): string {
  if (!folderId) return '';
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const parts: string[] = [];
  const seen = new Set<string>();
  let folder = byId.get(folderId);
  while (folder) {
    if (seen.has(folder.id)) return '';
    seen.add(folder.id);
    const slug = folder.name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'folder';
    const id = folder.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'folder';
    parts.unshift(`${slug}-${id}`);
    folder = folder.parentId ? byId.get(folder.parentId) : undefined;
  }
  return parts.join('/');
}

export function renderMeetingMarkdown(meeting: StoredMeeting): string {
  const out = [`# ${meeting.title}`, ''];
  out.push(`- Date: ${meetingDateTime(meeting)}`);
  if (meeting.durationSeconds !== null) out.push(`- Duration: ${formatClock(meeting.durationSeconds)}`);
  out.push(`- Meeting id: ${meeting.id}`, '');
  const participants = meeting.participants ?? [];
  if (participants.length > 0) out.push('## Participants', '', ...participants.map((p) => `- ${p}`), '');
  const speakers = speakerNames(meeting);
  out.push('## Speakers', '', ...(speakers.length > 0 ? speakers.map((s) => `- ${s}`) : ['(none)']), '');
  const summary = summaryText(meeting);
  out.push('## Summary', '', summary || '(no decisions or action items)', '');
  out.push(...insightsMarkdown(meeting));
  const transcript = transcriptLines(meeting).join('\n\n');
  out.push('## Transcript', '', transcript || '(empty)');
  return out.join('\n') + '\n';
}
