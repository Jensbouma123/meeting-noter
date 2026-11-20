// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SHARD_PROGRESS_MESSAGE } from '../../../../../scripts/echo-eval/lib/grid-url';
import { parseShardMessage, shardMessage } from './shardMessage';
import { useShardProgress } from './useShardProgress';

const send = (data: unknown, origin = window.location.origin) =>
  act(() => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });

describe('parseShardMessage', () => {
  it('marks a shard ready once it is past loading, cached models or not', () => {
    expect(shardMessage(0, 'running: 2/6 meet-dev-4', 'running').ready).toBe(true);
    expect(shardMessage(0, 'done: 6/6', 'done').ready).toBe(true);
    expect(shardMessage(0, 'loading: 0/6', 'loading').ready).toBe(false);
  });

  it('accepts the legacy shape without a ready flag and rejects foreign messages', () => {
    expect(parseShardMessage({ type: SHARD_PROGRESS_MESSAGE, shard: 0, text: 't', phase: 'running' })?.ready).toBe(true);
    expect(parseShardMessage({ type: 'other', shard: 0 })).toBeNull();
    expect(parseShardMessage({ type: SHARD_PROGRESS_MESSAGE, shard: 'x' })).toBeNull();
    expect(parseShardMessage('hello')).toBeNull();
  });
});

describe('useShardProgress', () => {
  it('shows the latest text per shard from same-origin frames only', () => {
    const { result } = renderHook(() => useShardProgress());
    send(shardMessage(0, 'loading: 0/6 loading plan', 'loading'));
    send(shardMessage(1, 'running: 1/3', 'running'));
    send(shardMessage(0, 'done: 0/0', 'done'), 'https://evil.example');
    expect(result.current).toEqual({ 0: 'loading: 0/6 loading plan', 1: 'running: 1/3' });
  });
});
