// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import packageJson from '../../../package.json';

const currentVersion = packageJson.version;

const { findNewerRelease } = vi.hoisted(() => ({ findNewerRelease: vi.fn() }));
vi.mock('../../lib/update/version.mjs', () => ({ findNewerRelease }));

import { UPDATE_DISMISSED_KEY, UPDATE_REFRESH_MS } from './constants';
import { applyUpdate } from './updateActions';
import { checkForUpdate } from './updateCheck';
import { getUpdateSnapshot } from './updateState';
import { useUpdate } from './useUpdate';

describe('useUpdate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
    findNewerRelease.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('checks immediately and refreshes every six hours', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ current: currentVersion, latest: '0.3.1', available: true, canApply: true, pageUrl: 'https://example.test' }),
    } as Response);
    const { result, unmount } = renderHook(() => useUpdate());

    await act(async () => { await checkForUpdate(); });
    expect(result.current.info?.latest).toBe('0.3.1');
    expect(fetchMock).toHaveBeenCalledWith('/api/app/update');
    await act(async () => { await vi.advanceTimersByTimeAsync(UPDATE_REFRESH_MS); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('manual refresh bypasses the server cache, the timer check does not', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ current: currentVersion, latest: currentVersion, available: false }) } as Response);
    const { result } = renderHook(() => useUpdate());
    await act(async () => { await checkForUpdate(); });
    fetchMock.mockClear();
    await act(async () => { await result.current.refresh(); });
    expect(fetchMock).toHaveBeenCalledWith('/api/app/update?refresh=1');
  });

  it('uses the release lookup when the endpoint is unavailable and disables apply', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
    findNewerRelease.mockResolvedValue({
      version: '0.3.1', name: 'v0.3.1', notes: 'Release notes', pageUrl: 'https://example.test/release', publishedAt: null,
    });
    const { result } = renderHook(() => useUpdate());

    await act(async () => { await checkForUpdate(); });
    expect(result.current.info?.latest).toBe('0.3.1');
    expect(findNewerRelease).toHaveBeenCalledWith(currentVersion);
    expect(result.current.info?.canApply).toBe(false);
  });

  it('stores dismissal for the available version', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ current: currentVersion, latest: '0.3.1', available: true, canApply: true }),
    } as Response);
    const { result } = renderHook(() => useUpdate());
    await act(async () => { await checkForUpdate(); });
    expect(result.current.info?.latest).toBe('0.3.1');

    act(() => result.current.dismiss());

    expect(localStorage.getItem(UPDATE_DISMISSED_KEY)).toBe('0.3.1');
    expect(result.current.dismissedVersion).toBe('0.3.1');
  });

  it('sends the backend apply request with its required header', async () => {
    const status = { state: 'running', phase: 'starting', percent: null, code: 'preparing', detail: null, fromVersion: currentVersion, toVersion: '0.3.1', startedAt: null, finishedAt: null, restartRequired: false, logTail: '' };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ status }) } as Response);

    await expect(applyUpdate()).resolves.toEqual(status);
    expect(fetch).toHaveBeenCalledWith('/api/app/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Meeting-Noter': '1' },
      body: '{}',
    });
    expect(getUpdateSnapshot().applyStatus).toEqual(status);
  });
});
