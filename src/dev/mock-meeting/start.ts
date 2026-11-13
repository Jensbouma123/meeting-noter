import type { StartOpts } from '@/lib/meeting';
import { clearLangTimer, scheduleMockLanguage } from './language';
import { restartLevelsLoop } from './levels';
import { advanceSimulation } from './simulation';
import { simulation, updateState } from './simulation-state';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isDemoMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
}

function resetScriptPosition(): void {
  if (simulation.streamTimer) clearTimeout(simulation.streamTimer);
  clearLangTimer();
  simulation.isPaused = false;
  simulation.turnIndex = 0;
  simulation.wordIndex = 0;
  simulation.segmentId = 1;
  simulation.activeSpeakerId = null;
}

function startDemoImmediately(opts: StartOpts): void {
  updateState({
    status: 'live',
    mode: opts.mode,
    startedAt: Date.now() - 3200,
    serverReady: true,
    error: null,
    warning: null,
    language: null,
    segments: [],
    speakers: {},
    stats: { rtf: 0.28, lagMs: 82, rssMb: 410 },
  });
  restartLevelsLoop();
  advanceSimulation();
  scheduleMockLanguage();
}

async function startWithConnectingDelay(opts: StartOpts): Promise<void> {
  updateState({
    status: 'requesting',
    mode: opts.mode,
    startedAt: Date.now(),
    error: null,
    warning: null,
    language: null,
    segments: [],
    speakers: {},
  });
  await wait(200);
  updateState({ status: 'connecting', serverReady: true });
  await wait(250);
  updateState({ status: 'live', stats: { rtf: 0.28, lagMs: 82, rssMb: 410 } });
  restartLevelsLoop();
  simulation.streamTimer = setTimeout(advanceSimulation, 500);
  scheduleMockLanguage();
}

export async function startMockMeeting(opts: StartOpts): Promise<void> {
  const { status } = simulation.state;
  if (status === 'live' || status === 'connecting' || status === 'requesting') return;
  resetScriptPosition();
  if (isDemoMode()) {
    startDemoImmediately(opts);
    return;
  }
  await startWithConnectingDelay(opts);
}
