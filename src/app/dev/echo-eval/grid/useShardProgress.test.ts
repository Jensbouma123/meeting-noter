// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows shard text and warms when shard 0 reports it is running', () => {
    const { result } = renderHook(() => useShardProgress());
    send(shardMessage(0, 'loading: 0/6 loading plan', 'loading'));
    expect(result.current).toEqual({ texts: { 0: 'loading: 0/6 loading plan' }, warm: false });
    send(shardMessage(0, 'running: 2/6 meet-dev-4', 'running'));
    expect(result.current).toEqual({ texts: { 0: 'running: 2/6 meet-dev-4' }, warm: true });
  });

  it('ignores progress from other shards and other origins for warming', () => {
    const { result } = renderHook(() => useShardProgress());
    send(shardMessage(1, 'running: 1/3', 'running'));
    send(shardMessage(0, 'running: 1/3', 'running'), 'https://evil.example');
    expect(result.current.warm).toBe(false);
    expect(result.current.texts).toEqual({ 1: 'running: 1/3' });
  });

  it('starts the remaining cells after the fallback timeout even with no message', () => {
    const { result } = renderHook(() => useShardProgress(90_000));
    act(() => vi.advanceTimersByTime(89_999));
    expect(result.current.warm).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.warm).toBe(true);
  });
});
