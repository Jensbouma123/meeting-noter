// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SHARD_PROGRESS_MESSAGE } from '../../../../scripts/echo-eval/lib/grid-url';
import { SHARD_HEARTBEAT_MS } from './grid/shardMessage';
import { useShardReporter } from './useShardReporter';

describe('useShardReporter', () => {
  const postMessage = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage } as unknown as Window);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    postMessage.mockReset();
  });

  it('posts progress with a ready flag and re-posts it as a heartbeat', () => {
    renderHook(() => useShardReporter(0, 'running: 2/6 meet-dev-4', 'running'));
    const expected = { type: SHARD_PROGRESS_MESSAGE, shard: 0, text: 'running: 2/6 meet-dev-4', phase: 'running', ready: true };
    expect(postMessage).toHaveBeenLastCalledWith(expected, '*');
    vi.advanceTimersByTime(SHARD_HEARTBEAT_MS * 2);
    expect(postMessage).toHaveBeenCalledTimes(3);
    expect(postMessage).toHaveBeenLastCalledWith(expected, '*');
  });

  it('stays silent outside a shard', () => {
    renderHook(() => useShardReporter(undefined, 'idle: 0/0', 'idle'));
    vi.advanceTimersByTime(SHARD_HEARTBEAT_MS * 2);
    expect(postMessage).not.toHaveBeenCalled();
  });
});
