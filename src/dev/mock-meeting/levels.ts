import type { Levels } from '@/lib/meeting';
import { levelListeners, simulation } from './simulation-state';

const targetLevels: Levels = { mic: 0, system: 0 };
const ATTACK = 0.5;
const RELEASE = 0.08;

function pickTargetLevels(): void {
  const { state, isPaused, activeSpeakerId } = simulation;
  if (state.status !== 'live' || isPaused) {
    targetLevels.mic = 0;
    targetLevels.system = 0;
    return;
  }
  if (activeSpeakerId?.startsWith('mic:')) {
    targetLevels.mic = 0.25 + Math.random() * 0.55;
    targetLevels.system = 0.02 + Math.random() * 0.04;
  } else if (activeSpeakerId?.startsWith('system:')) {
    targetLevels.system = 0.3 + Math.random() * 0.5;
    targetLevels.mic = 0.02 + Math.random() * 0.03;
  } else {
    targetLevels.mic = 0.02 + Math.random() * 0.03;
    targetLevels.system = 0.02 + Math.random() * 0.03;
  }
}

function smoothTowardTargets(): void {
  const levels = simulation.currentLevels;
  const micK = targetLevels.mic > levels.mic ? ATTACK : RELEASE;
  const sysK = targetLevels.system > levels.system ? ATTACK : RELEASE;
  levels.mic += (targetLevels.mic - levels.mic) * micK;
  levels.system += (targetLevels.system - levels.system) * sysK;
}

export function runLevelsLoop(): void {
  pickTargetLevels();
  smoothTowardTargets();
  for (const listener of levelListeners) {
    listener({ mic: simulation.currentLevels.mic, system: simulation.currentLevels.system });
  }
  const { status } = simulation.state;
  if (typeof window !== 'undefined' && (status === 'live' || status === 'paused')) {
    simulation.rafId = requestAnimationFrame(runLevelsLoop);
  }
}

export function stopLevelsLoop(): void {
  if (simulation.rafId !== null) {
    cancelAnimationFrame(simulation.rafId);
    simulation.rafId = null;
  }
  simulation.currentLevels = { mic: 0, system: 0 };
  for (const listener of levelListeners) {
    listener({ mic: 0, system: 0 });
  }
}

export function restartLevelsLoop(): void {
  if (typeof window === 'undefined') return;
  stopLevelsLoop();
  simulation.rafId = requestAnimationFrame(runLevelsLoop);
}
