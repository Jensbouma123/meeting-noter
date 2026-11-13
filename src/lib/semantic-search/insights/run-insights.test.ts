import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { capture: false };
vi.mock('@/lib/meeting/transcript-session', () => ({ isCaptureActive: () => state.capture }));
vi.mock('@/lib/meeting/session-transcript-storage', () => ({
  loadSessionTranscript: () => ({ segments: [{ id: 's1', source: 'mic', speaker: 'mic:0', text: 'We decided to ship it Friday.', start: 1, end: 3, final: true }] }),
}));
const extract = vi.fn(async () => []);
vi.mock('./extract', () => ({ extractInsights: extract }));
const push = vi.fn(async () => true);
vi.mock('./sync', () => ({ pushInsights: push }));
vi.mock('./store', () => ({ loadInsights: () => ({ version: 1, items: [], dismissed: ['x'] }), saveInsights: vi.fn() }));

describe('runInsights', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not extract while a capture is active', async () => {
    state.capture = true;
    const { runInsights } = await import('./run-insights');
    await runInsights('m1', { dim: 1, embed: async () => [] });
    expect(extract).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('extracts, keeps earlier dismissals and pushes to the server when idle', async () => {
    state.capture = false;
    const { runInsights } = await import('./run-insights');
    await runInsights('m1', { dim: 1, embed: async () => [] });
    expect(extract).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith('m1', { version: 2, items: [], dismissed: ['x'] });
  });
});
