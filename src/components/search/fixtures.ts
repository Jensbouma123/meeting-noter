import type { Chapter, Hit } from '@/lib/semantic-search/types';

export const hit = (meetingId: string, index: number, start: number, text: string): Hit => ({
  meetingId,
  score: 0.9,
  window: { meetingId, index, start, end: start + 30, text },
});

export const chapter = (index: number, start: number, end: number, title: string): Chapter => ({
  meetingId: 'm1',
  index,
  start,
  end,
  windowStart: 0,
  windowEnd: 1,
  title,
  terms: [title],
});
