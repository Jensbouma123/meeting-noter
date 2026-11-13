import { describe, expect, it } from 'vitest';
import { placeToolbar } from './placeToolbar';

describe('placeToolbar', () => {
  const bounds = { top: 0, bottom: 600, left: 100, right: 700 };
  const size = { width: 120, height: 32 };

  it('sits above the selection, centred, with a gap', () => {
    const p = placeToolbar({ top: 200, bottom: 218, left: 300, right: 360 }, bounds, size);
    expect(p.side).toBe('above');
    expect(p.top).toBe(200 - 8 - 32);
    expect(p.left).toBe(330 - 60);
    expect(p.arrowX).toBe(60);
    expect(p.top + size.height).toBeLessThanOrEqual(200);
  });

  it('flips below when there is no room above', () => {
    const p = placeToolbar({ top: 20, bottom: 38, left: 300, right: 360 }, bounds, size);
    expect(p.side).toBe('below');
    expect(p.top).toBe(38 + 8);
  });

  it('stays inside the transcript sideways and keeps the pointer on the selection', () => {
    const left = placeToolbar({ top: 200, bottom: 218, left: 102, right: 130 }, bounds, size);
    expect(left.left).toBe(104);
    expect(left.arrowX).toBe(12);
    const right = placeToolbar({ top: 200, bottom: 218, left: 670, right: 698 }, bounds, size);
    expect(right.left + size.width).toBe(696);
    expect(right.arrowX).toBeGreaterThan(60);
  });
});
