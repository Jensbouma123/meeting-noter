import type { StoredMeeting } from './types';

/** A two-speaker meeting with notes, for the meetings DB and MCP tests. */
export function sampleMeeting(over: Partial<StoredMeeting> = {}): StoredMeeting {
  return {
    id: 'meeting-1',
    title: 'Roadmap sync',
    createdAt: Date.UTC(2026, 10, 3, 9, 0),
    updatedAt: Date.UTC(2026, 10, 3, 10, 0),
    startedAt: Date.UTC(2026, 10, 3, 9, 0),
    durationSeconds: 95,
    captureMode: 'both',
    isDraft: false,
    segments: [
      { id: 's2', source: 'system', speaker: 'system:1', text: 'We ship the café export on Friday.', start: 40, end: 44 },
      { id: 's1', source: 'mic', speaker: 'mic:0', text: 'Let us look at the quarterly budget.', start: 2, end: 6 },
    ],
    speakers: {
      'mic:0': { id: 'mic:0', source: 'mic', label: 'Jens', colorIndex: 0 },
      'system:1': { id: 'system:1', source: 'system', label: 'Anna', colorIndex: 1 },
    },
    notes: {
      decisions: [{ id: 'd1', text: 'Freeze the scope' }],
      actions: [{ id: 'a1', text: 'Draft the release notes', ownerName: 'Anna', done: false }],
    },
    ...over,
  };
}
