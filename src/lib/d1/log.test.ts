import { afterEach, describe, expect, it, vi } from 'vitest';
import { d1Debug, d1Info, d1Warn, setD1LogSink } from './log';

describe('d1 log', () => {
  afterEach(() => setD1LogSink(null));

  it('with a sink, forwards a cloneable copy and does not print in the worker (no duplicates)', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const sent: Array<[string, unknown[]]> = [];
    setD1LogSink((level, args) => sent.push([level, args]));
    try {
      d1Info('[D1] x', { a: 1 }, new Error('boom'), Symbol('s'));
      d1Warn('[D1] w');
      d1Debug('[D1] d');
      expect(info).not.toHaveBeenCalled();
      expect(sent).toEqual([
        ['info', ['[D1] x', { a: 1 }, 'Error: boom', 'Symbol(s)']],
        ['warn', ['[D1] w']],
        ['debug', ['[D1] d']],
      ]);
    } finally {
      info.mockRestore();
    }
  });

  it('without a sink, prints info and warn and keeps debug quiet', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      d1Debug('[D1] d');
      d1Info('[D1] i');
      d1Warn('[D1] w');
      expect(info.mock.calls).toEqual([['[D1] i']]);
      expect(warn.mock.calls).toEqual([['[D1] w']]);
    } finally {
      info.mockRestore();
      warn.mockRestore();
    }
  });

  it('never throws when the sink does', () => {
    setD1LogSink(() => { throw new Error('closed'); });
    expect(() => d1Info('[D1] y')).not.toThrow();
  });
});
