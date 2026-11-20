import { afterEach, describe, expect, it, vi } from 'vitest';

describe('reportWebGpuUnavailable', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs the first reason once and ignores empty reasons', async () => {
    vi.resetModules();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { reportWebGpuUnavailable } = await import('./webgpu-report');
    reportWebGpuUnavailable(undefined);
    reportWebGpuUnavailable('Failed to get GPU adapter.');
    reportWebGpuUnavailable('second');
    expect(warn.mock.calls).toEqual([['[diarizer] webgpu unavailable: Failed to get GPU adapter.']]);
  });
});
