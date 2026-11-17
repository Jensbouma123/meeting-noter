import { describe, expect, it, vi } from 'vitest';
import { EXPORT_TYPE, LIMITS, REQUEST_TYPE } from './constants';
import { exportPage } from './export-page';

function runPage(items: Record<string, string>) {
  const script = /<script>([\s\S]*)<\/script>/.exec(exportPage(47823).html)?.[1] ?? '';
  const keys = Object.keys(items);
  const storage = { length: keys.length, key: (i: number) => keys[i] ?? null, getItem: (k: string) => items[k] ?? null };
  let handler: (e: { origin: string; source: unknown; data: unknown }) => void = () => undefined;
  new Function('addEventListener', 'localStorage', script)((_: string, h: typeof handler) => { handler = h; }, storage);
  return (origin: string, data: unknown = { type: REQUEST_TYPE }) => {
    const source = { postMessage: vi.fn() };
    handler({ origin, source, data });
    return source.postMessage.mock.calls;
  };
}

describe('legacy export page script', () => {
  it('answers only the new app origins, with allowlisted keys, to the asking origin', () => {
    const ask = runPage({ 'mn.settings': '{}', 'mn.model-registry.v1': '{}', 'mn.session.s1.v1': '[]', other: 'x' });
    expect(ask('http://evil.example')).toEqual([]);
    expect(ask('http://localhost:3000')).toEqual([]);
    expect(ask('http://localhost:47823', { type: 'other' })).toEqual([]);
    const calls = ask('http://127.0.0.1:47823');
    expect(calls).toEqual([[{ type: EXPORT_TYPE, version: 1, entries: [['mn.settings', '{}'], ['mn.session.s1.v1', '[]']] }, 'http://127.0.0.1:47823']]);
  });

  it('leaves out values over the size limit', () => {
    const ask = runPage({ 'mn.title': 'x'.repeat(LIMITS.maxValueChars + 1), 'mn.settings': '{}' });
    expect(ask('http://localhost:47823')[0][0].entries).toEqual([['mn.settings', '{}']]);
  });
});
