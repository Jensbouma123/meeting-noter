// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const probe = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@/lib/asr/browser', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  probeRegisteredModelSizes: () => probe(),
}));

import { useModelSizesKnown } from './useModelSizesKnown';

const entry = { key: 'asr', status: 'not-downloaded' } as never;

beforeEach(() => {
  probe.mockClear();
});

describe('useModelSizesKnown', () => {
  it('stays false and does not probe while there are no registry entries', () => {
    const { result } = renderHook(() => useModelSizesKnown({}));
    expect(result.current).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it('probes once entries exist and reports true after the probe resolves', async () => {
    const { result } = renderHook(() => useModelSizesKnown({ asr: entry }));
    expect(probe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('re-probes when the entries object changes', async () => {
    const { result, rerender } = renderHook(
      ({ entries }: { entries: Record<string, never> }) => useModelSizesKnown(entries),
      { initialProps: { entries: { asr: entry } } },
    );
    await waitFor(() => expect(result.current).toBe(true));
    rerender({ entries: { asr: entry } });
    expect(probe).toHaveBeenCalledTimes(2);
  });
});
