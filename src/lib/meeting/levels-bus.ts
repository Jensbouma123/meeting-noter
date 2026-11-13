import type { Levels, Source } from './types';

const METER_FLOOR_DB = -60;
const METER_DECAY = 0.92;
const METER_SILENCE_THRESHOLD = 0.001;

const levelCache: Levels = { mic: 0, system: 0 };
const levelListeners = new Set<(l: Levels) => void>();
let levelRaf = 0;

function decayLevel(level: number): number {
  const decayed = level * METER_DECAY;
  return decayed < METER_SILENCE_THRESHOLD ? 0 : decayed;
}

function levelTick(): void {
  levelRaf = 0;
  if (levelListeners.size === 0) return;
  levelCache.mic = decayLevel(levelCache.mic);
  levelCache.system = decayLevel(levelCache.system);
  const snapshot: Levels = { mic: levelCache.mic, system: levelCache.system };
  for (const fn of levelListeners) fn(snapshot);
  levelRaf = requestAnimationFrame(levelTick);
}

export function meterLevel(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(Math.min(1, rms));
  return Math.max(0, Math.min(1, 1 - db / METER_FLOOR_DB));
}

export function pushLevel(source: Source, rms: number): void {
  levelCache[source] = meterLevel(rms);
}

export function resetLevels(): void {
  levelCache.mic = 0;
  levelCache.system = 0;
}

export function subscribeLevels(cb: (l: Levels) => void): () => void {
  levelListeners.add(cb);
  if (levelRaf === 0 && typeof requestAnimationFrame !== 'undefined') {
    levelRaf = requestAnimationFrame(levelTick);
  }
  return () => {
    levelListeners.delete(cb);
    if (levelListeners.size === 0 && levelRaf !== 0) {
      cancelAnimationFrame(levelRaf);
      levelRaf = 0;
    }
  };
}
