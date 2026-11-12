import { afterEach, describe, expect, it, vi } from 'vitest';
import { d1Log, setD1LogSink } from './log';

describe('d1Log', () => {
  afterEach(() => setD1LogSink(null));

  it('prints to the console and forwards a cloneable copy to the sink', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const sent: unknown[][] = [];
    setD1LogSink((args) => sent.push(args));
    try {
      d1Log('[D1] x', { a: 1 }, new Error('boom'), Symbol('s'));
      expect(info).toHaveBeenCalledTimes(1);
      expect(sent).toEqual([['[D1] x', { a: 1 }, 'Error: boom', 'Symbol(s)']]);
    } finally {
      info.mockRestore();
    }
  });

  it('never throws when the sink does', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    setD1LogSink(() => { throw new Error('closed'); });
    try {
      expect(() => d1Log('[D1] y')).not.toThrow();
    } finally {
      info.mockRestore();
    }
  });
});
