import { describe, expect, it } from 'vitest';
import { installableUpdate } from './check-update.mjs';

const assets = (...names: string[]) => names.map((name) => ({ name }));
const full = assets('meeting-noter-macos-arm64.tar.gz', 'meeting-noter-macos-arm64.tar.gz.sha256');

describe('installableUpdate', () => {
  it('returns the newer version when the tarball for this arch is attached', () => {
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: full }, '0.1.0', 'arm64')).toBe('0.2.0');
  });

  it('ignores a release that is not newer', () => {
    expect(installableUpdate({ tag_name: 'v0.1.0', assets: full }, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.0.9', assets: full }, '0.1.0', 'arm64')).toBeNull();
  });

  it('waits until the release workflow has uploaded this arch', () => {
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: [] }, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.2.0', assets: full }, '0.1.0', 'x64')).toBeNull();
    expect(
      installableUpdate({ tag_name: 'v0.2.0', assets: assets('meeting-noter-macos-arm64.tar.gz') }, '0.1.0', 'arm64'),
    ).toBeNull();
  });

  it('survives malformed answers', () => {
    expect(installableUpdate(null, '0.1.0', 'arm64')).toBeNull();
    expect(installableUpdate({ tag_name: 'v0.2.0' }, '0.1.0', 'arm64')).toBeNull();
  });
});
