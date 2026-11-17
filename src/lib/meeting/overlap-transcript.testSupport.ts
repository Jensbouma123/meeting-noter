import { seg } from './export.testUtils';

export const overlap = { start: 4, end: 6, speakers: ['mic:0', 'mic:1'] };

export const speakers = {
  'mic:0': { id: 'mic:0', source: 'mic' as const, label: 'Ann', colorIndex: 0 },
  'mic:1': { id: 'mic:1', source: 'mic' as const, label: 'Bo', colorIndex: 1 },
  'mic:2': { id: 'mic:2', source: 'mic' as const, label: 'Cy', colorIndex: 2 },
};

export const transcript = [
  seg({ id: 'a', speaker: 'mic:0', start: 0, end: 4, text: 'so I think' }),
  seg({ id: 'b', speaker: 'mic:0', start: 4.1, end: 5, text: 'we should', overlap }),
  seg({ id: 'c', speaker: 'mic:1', start: 4.5, end: 5.8, text: 'no wait', overlap }),
  seg({ id: 'd', speaker: 'mic:1', start: 6, end: 8, text: 'hear me out' }),
];
