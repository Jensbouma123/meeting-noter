import { useSyncExternalStore } from 'react';
import { getState, subscribe } from './store-core';
import type { Segment, Source, Speaker } from './types';
import type { SpeakerStat } from './types/speaker-stat';

function fallbackSpeaker(id: string): Speaker {
  return {
    id,
    source: (id.startsWith('mic') ? 'mic' : 'system') as Source,
    label: id.startsWith('mic') ? 'You' : `Speaker ${id}`,
    colorIndex: id.startsWith('mic') ? 0 : 1,
  };
}

export function computeSpeakerStats(
  segments: Segment[],
  speakers: Record<string, Speaker>
): SpeakerStat[] {
  const times: Record<string, number> = {};

  for (const seg of segments) {
    const dur = Math.max(0, seg.end - seg.start);
    times[seg.speaker] = (times[seg.speaker] ?? 0) + dur;
  }

  const totalTime = Object.values(times).reduce((acc, t) => acc + t, 0);
  const allIds = Array.from(new Set([...Object.keys(speakers), ...Object.keys(times)]));

  return allIds.map((id) => {
    const info = speakers[id] ?? fallbackSpeaker(id);
    const time = times[id] ?? 0;
    const percentage = totalTime > 0 ? (time / totalTime) * 100 : 0;
    return { ...info, time, percentage };
  });
}

export function useSpeakerStats(): SpeakerStat[] {
  const s = useSyncExternalStore(subscribe, getState, getState);
  return computeSpeakerStats(s.segments, s.speakers);
}
