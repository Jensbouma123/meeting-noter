// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { EXPORT_TYPE } from './constants';
import { requestExport } from './request-export';

const payload = { type: EXPORT_TYPE, version: 1, entries: [['mn.settings', '{}']] };
const frame = () => document.querySelector('iframe') as HTMLIFrameElement;
const post = (origin: string, source: MessageEventSource | null, data: unknown = payload) =>
  window.dispatchEvent(new MessageEvent('message', { origin, source, data }));

describe('requestExport', () => {
  afterEach(() => document.body.replaceChildren());

  it('embeds the old origin on the same hostname and accepts its answer', async () => {
    const result = requestExport(window, 1_000, 3000);
    expect(frame().src).toBe(`http://${location.hostname}:3000/legacy-export`);
    post(`http://${location.hostname}:3000`, frame().contentWindow);
    await expect(result).resolves.toEqual([['mn.settings', '{}']]);
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('ignores messages from other windows or origins and times out', async () => {
    const result = requestExport(window, 50, 3000);
    post(`http://${location.hostname}:3000`, window);
    post('http://evil.example', frame().contentWindow);
    await expect(result).resolves.toBeNull();
  });

  it('refuses a payload with an unknown key', async () => {
    const result = requestExport(window, 1_000, 3000);
    post(`http://${location.hostname}:3000`, frame().contentWindow, { ...payload, entries: [['evil', 'x']] });
    await expect(result).resolves.toBeNull();
  });
});
