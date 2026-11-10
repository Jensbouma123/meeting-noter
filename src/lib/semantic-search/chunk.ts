import type { TranscriptLine, Window } from './types';

export interface ChunkOpts {
  /** Window length in seconds. */
  windowSeconds?: number;
  /** Distance between window starts. Equal to `windowSeconds` by default (no overlap). */
  strideSeconds?: number;
}

/**
 * Cuts a finished transcript into time windows. A line belongs to the window
 * that holds its midpoint, so no line is ever embedded twice in one window
 * and lines that straddle a boundary land in exactly one place.
 * Windows with no text are skipped.
 */
export function chunkTranscript(
  meetingId: string,
  lines: TranscriptLine[],
  opts: ChunkOpts = {},
): Window[] {
  const width = opts.windowSeconds ?? 30;
  const stride = opts.strideSeconds ?? width;
  if (!(width > 0) || !(stride > 0)) {
    throw new RangeError('window and stride must be positive');
  }

  const sorted = lines
    .filter((l) => l.text.trim() !== '')
    .sort((a, b) => a.start - b.start);
  if (sorted.length === 0) return [];

  const end = Math.max(...sorted.map((l) => l.end));
  const origin = sorted[0].start;
  const windows: Window[] = [];

  for (let start = origin; start < end; start += stride) {
    const stop = start + width;
    const parts: string[] = [];
    for (const line of sorted) {
      const mid = (line.start + line.end) / 2;
      if (mid >= start && mid < stop) parts.push(line.text.trim());
    }
    if (parts.length === 0) continue;
    windows.push({
      meetingId,
      index: windows.length,
      start,
      end: Math.min(stop, end),
      text: parts.join(' '),
    });
  }
  return windows;
}
