import { describe, expect, it, vi } from 'vitest';
import { finalSegment as seg } from './session-store.testUtils';
import { registerMemoryStore } from './session-store.index.testSupport';

registerMemoryStore();

describe('renameSession (B5)', () => {
  it('updates the title and updatedAt, and a later persist keeps the new title', async () => {
    const { createDraftSession, renameSession, persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const a = createDraftSession('Standup');
    now.mockReturnValue(2000);
    expect(renameSession(a, 'Retro')).toBe(true);
    expect(getSessionMetadata(a)).toMatchObject({ title: 'Retro', updatedAt: 2000, createdAt: 1000 });
    persistSession({ sessionId: a, segments: [seg('a1', 0, 1)], speakers: {} });
    expect(getSessionMetadata(a)?.title).toBe('Retro');
    expect(renameSession('missing', 'x')).toBe(false);
    now.mockRestore();
  });
});

describe('persistSession metadata (B7)', () => {
  it('stamps a new entry with startedAt, not now', async () => {
    const { persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    persistSession({ sessionId: 'x', title: 'X', segments: [seg('x1', 0, 1)], speakers: {}, startedAt: 12345 });
    expect(getSessionMetadata('x')?.createdAt).toBe(12345);
  });

  it('keeps a draft a draft when persisted with no segments', async () => {
    const { createDraftSession, persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const a = createDraftSession('A');
    persistSession({ sessionId: a, segments: [], speakers: {} });
    expect(getSessionMetadata(a)?.isDraft).toBe(true);
  });

  it('computes duration over 200k segments without a RangeError', async () => {
    const { persistSession } = await import('./session-crud');
    const { getSessionMetadata } = await import('./session-open');
    const many = Array.from({ length: 200_000 }, (_, i) => seg(`s${i}`, i, i + 1));
    persistSession({ sessionId: 'big', title: 'Big', segments: many, speakers: {} });
    expect(getSessionMetadata('big')?.durationSeconds).toBe(200_000);
  });
});
