// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionMetadata } from '@/lib/meeting/types/session-store';
import * as compute from '@/lib/semantic-search/folder-suggest/compute';
import { useFolderSuggestions } from './useFolderSuggestions';

const stable = vi.hoisted(() => ({}));
vi.mock('@/lib/folders/folders-api', () => ({
  FOLDERS_CHANGED_EVENT: 'mn:folders-changed',
  declineFolderSuggestion: vi.fn(),
  fetchDeclinedSuggestions: vi.fn(async () => null),
  moveMeeting: vi.fn(),
}));
vi.mock('./useFolderContextVectors', () => ({ useFolderContextVectors: () => stable }));

const sessions = [{ sessionId: 'a' }, { sessionId: 'b' }] as SessionMetadata[];

describe('useFolderSuggestions', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('skips recomputing when folder assignments are equal in content', () => {
    const spy = vi.spyOn(compute, 'computeFolderSuggestions');
    const { rerender } = renderHook(({ mf }) => useFolderSuggestions(sessions, [], mf), {
      initialProps: { mf: { a: 'f1', b: null } as Record<string, string | null> },
    });
    const initial = spy.mock.calls.length;
    expect(initial).toBeGreaterThan(0);
    rerender({ mf: { b: null, a: 'f1' } });
    rerender({ mf: { a: 'f1', b: null } });
    expect(spy.mock.calls.length).toBe(initial);
    rerender({ mf: { a: 'f2', b: null } });
    expect(spy.mock.calls.length).toBe(initial + 1);
  });
});
