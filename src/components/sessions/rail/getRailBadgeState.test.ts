import { describe, expect, it } from 'vitest';
import { getRailBadgeState } from './getRailBadgeState';
import { draft, recorded } from './test-support/draftSession';

describe('getRailBadgeState', () => {
  it('prefers recording over the draft flag while capturing', () => {
    expect(getRailBadgeState(draft(), true)).toBe('recording');
  });

  it('shows the draft badge only when not recording', () => {
    expect(getRailBadgeState(draft(), false)).toBe('draft');
  });

  it('shows no badge for a recorded session', () => {
    expect(getRailBadgeState(recorded(), false)).toBe('none');
  });
});
