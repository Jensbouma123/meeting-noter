import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getConfiguredAssistants,
  loadConfiguredAssistants,
  resetConfiguredAssistants,
  subscribeConfiguredAssistants,
} from './configuredAssistantsStore';

function respond(assistants: { id: string; status: string }[]) {
  return vi.fn(async () => new Response(JSON.stringify({ assistants })));
}

afterEach(() => {
  resetConfiguredAssistants();
  vi.unstubAllGlobals();
});

describe('configuredAssistantsStore', () => {
  it('loads on first subscribe and keeps only connected assistants', async () => {
    const fetchMock = respond([
      { id: 'claude-desktop', status: 'connected' },
      { id: 'claude-code', status: 'not-connected' },
      { id: 'codex', status: 'connected' },
      { id: 'other', status: 'connected' },
    ]);
    vi.stubGlobal('fetch', fetchMock);
    const onChange = vi.fn();
    const unsubscribe = subscribeConfiguredAssistants(onChange);
    expect(getConfiguredAssistants()).toEqual({ loaded: false, ids: [] });
    await loadConfiguredAssistants();
    expect(fetchMock).toHaveBeenCalledWith('/api/assistants');
    expect(getConfiguredAssistants()).toEqual({ loaded: true, ids: ['claude-desktop', 'codex'] });
    expect(onChange).toHaveBeenCalled();
    unsubscribe();
  });

  it('keeps the last known list when a reload fails', async () => {
    vi.stubGlobal('fetch', respond([{ id: 'codex', status: 'connected' }]));
    await loadConfiguredAssistants();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    await loadConfiguredAssistants();
    expect(getConfiguredAssistants()).toEqual({ loaded: true, ids: ['codex'] });
  });
});
