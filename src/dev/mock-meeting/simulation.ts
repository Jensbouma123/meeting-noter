import type { Segment, Speaker } from '@/lib/meeting';
import { MOCK_SPEAKERS_CATALOG } from './constants';
import { MOCK_SCRIPT } from './script';
import { simulation, updateState } from './simulation-state';
import type { ScriptTurn } from './types';

function speakersWith(turn: ScriptTurn): Record<string, Speaker> {
  const { speakers } = simulation.state;
  if (speakers[turn.speakerId]) return speakers;
  const meta = MOCK_SPEAKERS_CATALOG[turn.speakerId] ?? {
    id: turn.speakerId,
    source: turn.source,
    label: turn.source === 'mic' ? 'You' : `Speaker ${turn.speakerId}`,
    colorIndex: Object.keys(speakers).length,
  };
  return { ...speakers, [turn.speakerId]: meta };
}

function upsertSegment(segment: Segment): Segment[] {
  const { segments } = simulation.state;
  const existingIdx = segments.findIndex((s) => s.id === segment.id);
  if (existingIdx < 0) return [...segments, segment];
  const updated = [...segments];
  updated[existingIdx] = segment;
  return updated;
}

export function advanceSimulation(): void {
  if (simulation.state.status !== 'live' || simulation.isPaused) return;

  const turn = MOCK_SCRIPT[simulation.turnIndex % MOCK_SCRIPT.length];
  simulation.activeSpeakerId = turn.speakerId;
  const updatedSpeakers = speakersWith(turn);

  simulation.wordIndex++;
  const isFinal = simulation.wordIndex >= turn.words.length;
  const { startedAt } = simulation.state;
  const nowSec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const segment: Segment = {
    id: `mock-seg-${simulation.segmentId}`,
    source: turn.source,
    speaker: turn.speakerId,
    text: turn.words.slice(0, simulation.wordIndex).join(' '),
    start: Math.max(0, nowSec - simulation.wordIndex * 0.2),
    end: nowSec,
    final: isFinal,
  };

  updateState({
    speakers: updatedSpeakers,
    segments: upsertSegment(segment),
    stats: {
      rtf: Number((0.25 + Math.random() * 0.08).toFixed(2)),
      lagMs: Math.round(75 + Math.random() * 35),
      rssMb: 412,
    },
  });

  if (isFinal) {
    simulation.activeSpeakerId = null;
    simulation.wordIndex = 0;
    simulation.turnIndex++;
    simulation.segmentId++;
    simulation.streamTimer = setTimeout(advanceSimulation, 700 + Math.random() * 600);
  } else {
    simulation.streamTimer = setTimeout(advanceSimulation, 110 + Math.random() * 90);
  }
}
