export interface TurnSpan {
  speaker: number;
  start: number;
  end: number;
  run: number;
  final: boolean;
  continues?: true;
  pauses?: [number, number][];
}

export interface TurnTrackerOptions {
  numSpeakers: number;
  frameSec: number;
  threshold?: number;
  offThreshold?: number;
  overlapThreshold?: number;
  maxGapSec?: number;
  pauseSec?: number;
  minTurnSec?: number;
  maxOpenSec?: number;
  provisional?: boolean;
}

export interface OpenRun {
  id: number;
  startFrame: number;
  reportedEnd: number;
  lastActive: number;
  continued: boolean;
  pauses: [number, number][];
}
