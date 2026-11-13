import { clockTime, formatDuration } from './transcript-format';
import type { Turn } from './types/export';

export function headerRows(turns: Turn[], startedAt: number | null | undefined): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const first = turns[0];
  const spanEnd = turns.reduce((m, t) => Math.max(m, t.end), 0);
  const offset = first ? first.start : 0;
  const duration = Math.max(0, spanEnd - offset);
  if (startedAt) {
    const start = startedAt + offset * 1000;
    rows.push([
      'Date',
      new Date(startedAt).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    ]);
    rows.push(['Time', `${clockTime(start)}–${clockTime(start + duration * 1000)}`]);
  }
  if (first) rows.push(['Duration', formatDuration(duration)]);
  const names = [...new Set(turns.flatMap((t) => t.overlap?.labels ?? [t.label]))];
  if (names.length > 0) rows.push(['Participants', names.join(', ')]);
  return rows;
}
