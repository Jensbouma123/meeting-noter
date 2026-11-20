// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isDevRoute } from './is-dev-route';

describe('isDevRoute', () => {
  it('matches /dev and every route below it', () => {
    for (const p of ['/dev', '/dev/echo-eval', '/dev/echo-eval/grid']) expect(isDevRoute(p)).toBe(true);
  });

  it('leaves product routes and look-alikes alone', () => {
    for (const p of ['/', '/sessions/abc', '/devices', null]) expect(isDevRoute(p)).toBe(false);
  });
});
