import { describe, expect, it } from 'vitest';
import { compareVersions, findNewerRelease, installerAssetsReady, parseVersion } from './version.mjs';

const ok = (body: unknown) => async () => ({ ok: true, json: async () => body }) as Response;

describe('compareVersions', () => {
  it('orders versions numerically, not lexically', () => {
    expect(compareVersions('v0.10.0', '0.9.5')).toBe(1);
    expect(compareVersions('0.1.0', 'v0.1.1')).toBe(-1);
    expect(compareVersions('v1.2.3', '1.2.3')).toBe(0);
  });
  it('returns null for non-versions', () => {
    expect(compareVersions('latest', '1.0.0')).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
  });
});

describe('findNewerRelease', () => {
  it('returns the release when newer', async () => {
    const r = await findNewerRelease('0.1.0', {
      fetchFn: ok({ tag_name: 'v0.2.0', zipball_url: 'z', html_url: 'h' }),
    });
    expect(r).toEqual({
      version: '0.2.0',
      tag: 'v0.2.0',
      zipballUrl: 'z',
      pageUrl: 'h',
      name: 'v0.2.0',
      notes: null,
      publishedAt: null,
      assetNames: [],
    });
  });
  it('carries the release notes and asset names', async () => {
    const r = await findNewerRelease('0.1.0', {
      fetchFn: ok({
        tag_name: 'v0.2.0',
        name: 'Snellere start',
        body: '- Nieuw: bijwerken vanuit de app',
        published_at: '2026-11-10T12:00:00Z',
        assets: [{ name: 'meeting-noter-macos-arm64.tar.gz' }, { name: 'meeting-noter-macos-arm64.tar.gz.sha256' }],
      }),
    });
    expect(r).toMatchObject({ name: 'Snellere start', notes: '- Nieuw: bijwerken vanuit de app', publishedAt: '2026-11-10T12:00:00Z' });
    expect(installerAssetsReady(r!.assetNames, 'arm64')).toBe(true);
    expect(installerAssetsReady(r!.assetNames, 'x64')).toBe(false);
    expect(installerAssetsReady(['meeting-noter-macos-arm64.tar.gz'], 'arm64')).toBe(false);
  });
  it('returns null when equal or older', async () => {
    expect(await findNewerRelease('0.2.0', { fetchFn: ok({ tag_name: 'v0.2.0' }) })).toBeNull();
    expect(await findNewerRelease('0.3.0', { fetchFn: ok({ tag_name: 'v0.2.0' }) })).toBeNull();
  });
  it('returns null offline, on HTTP errors and on junk', async () => {
    expect(await findNewerRelease('0.1.0', { fetchFn: async () => { throw new Error('offline'); } })).toBeNull();
    expect(await findNewerRelease('0.1.0', { fetchFn: async () => ({ ok: false }) as Response })).toBeNull();
    expect(await findNewerRelease('0.1.0', { fetchFn: ok({ message: 'rate limited' }) })).toBeNull();
  });
});
