import { beforeEach, describe, expect, it, vi } from 'vitest';

const order: string[] = [];
const state = { status: 'idle', capture: false };
const embedder = { dim: 1, embed: async () => [] };
const gate = { ready: true };


vi.mock('@/lib/semantic-search/model-gate', () => ({ isSearchModelReady: () => gate.ready }));
vi.mock('./store-core', () => ({
  getState: () => ({ status: state.status, segments: [{ final: true, text: 'hello there' }] }),
  subscribe: () => () => {},
}));
vi.mock('./transcript-session', () => ({ getTranscriptSessionId: () => 'm1', isCaptureActive: () => state.capture }));
vi.mock('@/lib/semantic-search/service', () => ({
  withEmbedder: async (run: (e: unknown) => Promise<unknown>) => run(embedder),
  indexMeeting: vi.fn(async (_id: string, deps: { embedder: unknown }) => {
    expect(deps.embedder).toBe(embedder);
    order.push('index');
    return null;
  }),
}));
vi.mock('@/lib/semantic-search/insights/run-insights', () => ({
  runInsights: vi.fn(async (_id: string, e: unknown) => {
    expect(e).toBe(embedder);
    order.push('insights');
  }),
}));

async function run(): Promise<void> {
  const { schedulePostStopIntelligence } = await import('./post-stop-intelligence');
  schedulePostStopIntelligence(null);
  const { session } = await import('./session-state');
  await session.postStopChain;
}

describe('post-stop intelligence', () => {
  beforeEach(() => {
    order.length = 0;
    state.status = 'idle';
    gate.ready = true;
  });

  it('extracts insights after indexing with the same embedder', async () => {
    await run();
    expect(order).toEqual(['index', 'insights']);
  });

  it('does nothing while a capture is not idle', async () => {
    state.status = 'recording';
    await run();
    expect(order).toEqual([]);
  });

  it('keeps going when extraction throws', async () => {
    const { runInsights } = await import('@/lib/semantic-search/insights/run-insights');
    vi.mocked(runInsights).mockRejectedValueOnce(new Error('boom'));
    await run();
    expect(order).toEqual(['index']);
  });

  it('does nothing while the search model is not downloaded', async () => {
    gate.ready = false;
    await run();
    expect(order).toEqual([]);
  });
});
