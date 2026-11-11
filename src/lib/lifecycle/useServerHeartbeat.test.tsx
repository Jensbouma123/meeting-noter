// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HEARTBEAT_URL, useServerHeartbeat } from './useServerHeartbeat';

type Sent = { clientId: string; recording: boolean; closing?: boolean };

let fetchMock: ReturnType<typeof vi.fn>;
const sent = (): Sent[] => fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useServerHeartbeat', () => {
  it('beats on mount and every 15 s with one id per tab, and stops on unmount', () => {
    const a = renderHook(() => useServerHeartbeat());
    const b = renderHook(() => useServerHeartbeat());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(HEARTBEAT_URL);
    vi.advanceTimersByTime(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Set(sent().map((s) => s.clientId)).size).toBe(1);
    expect(sent().every((s) => s.recording === false)).toBe(true);
    a.unmount();
    b.unmount();
    vi.advanceTimersByTime(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports recording right away while any mount records', () => {
    renderHook(() => useServerHeartbeat());
    const rec = renderHook(({ on }) => useServerHeartbeat(on), { initialProps: { on: false } });
    rec.rerender({ on: true });
    expect(sent().at(-1)?.recording).toBe(true);
    vi.advanceTimersByTime(15_000);
    expect(sent().at(-1)?.recording).toBe(true);
    rec.unmount();
    expect(sent().at(-1)?.recording).toBe(false);
  });

  it('sends a closing beacon on pagehide', () => {
    const beacon = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true });
    const h = renderHook(() => useServerHeartbeat());
    window.dispatchEvent(new Event('pagehide'));
    expect(beacon).toHaveBeenCalledTimes(1);
    const [url, payload] = beacon.mock.calls[0] as unknown as [string, string];
    expect(url).toBe(HEARTBEAT_URL);
    expect(JSON.parse(payload)).toMatchObject({ closing: true, recording: false });
    h.unmount();
  });
});
