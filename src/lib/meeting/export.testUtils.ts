import type { Segment } from './types';

export const seg = (over: Partial<Segment> = {}): Segment =>
  ({ id: 's1', speaker: 'mic:0', source: 'mic', start: 0, end: 1, text: 'hi', final: true, ...over }) as Segment;
