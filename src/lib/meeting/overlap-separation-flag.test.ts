import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMossformer2Client } from '@/lib/separation/browser/client';
import { setOverlapSeparator } from './overlap-retranscribe';
import { OVERLAP_SEPARATION_KEY, installOverlapSeparator, overlapSeparationEnabled } from './overlap-separation-flag';

vi.mock('@/lib/separation/browser/client', () => ({
  createMossformer2Client: vi.fn(() => ({ name: 'mossformer2' })),
}));
vi.mock('./overlap-retranscribe', () => ({ setOverlapSeparator: vi.fn() }));

const stored = new Map<string, string>();

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
  });
});

afterEach(() => {
  stored.clear();
  vi.unstubAllGlobals();
  vi.mocked(setOverlapSeparator).mockClear();
});

describe('overlap separation dev flag', () => {
  it('is off unless localStorage names mossformer2', () => {
    expect(overlapSeparationEnabled()).toBe(false);
    localStorage.setItem(OVERLAP_SEPARATION_KEY, '1');
    expect(overlapSeparationEnabled()).toBe(false);
    localStorage.setItem(OVERLAP_SEPARATION_KEY, 'mossformer2');
    expect(overlapSeparationEnabled()).toBe(true);
  });

  it('installs no separator when off', () => {
    expect(installOverlapSeparator()).toBeNull();
    expect(setOverlapSeparator).toHaveBeenCalledWith(null);
  });

  it('installs one shared MossFormer2 client when on', () => {
    localStorage.setItem(OVERLAP_SEPARATION_KEY, 'mossformer2');
    const first = installOverlapSeparator();
    const second = installOverlapSeparator();
    expect(first).toMatchObject({ name: 'mossformer2' });
    expect(second).toBe(first);
    expect(createMossformer2Client).toHaveBeenCalledTimes(1);
    expect(setOverlapSeparator).toHaveBeenLastCalledWith(first);
  });
});
