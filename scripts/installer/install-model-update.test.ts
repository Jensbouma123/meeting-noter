import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PREBUILT,
  installWithGpuModelPinnedToPrebuilt,
  launcherServerStarts,
  localBuildRuns,
  modelFile,
  partFile,
  publishModelAtDefaultTestUrl,
  sha256,
} from './install-sandbox/model-install';
import { publishRelease } from './install-sandbox/publish-release';
import { useInstallSandbox } from './install-sandbox/sandbox';

const markerFile = () => `${modelFile()}.sha256`;
const serverOn = { MEETING_NOTER_RUN_SERVER: '1', MEETING_NOTER_PORT: '39518' };

function installedModel(body: string, marker?: string) {
  mkdirSync(path.dirname(modelFile()), { recursive: true });
  writeFileSync(modelFile(), body);
  if (marker !== undefined) writeFileSync(markerFile(), `${marker}\n`);
}

describe.skipIf(process.platform !== 'darwin')('install.sh speech model updates', () => {
  useInstallSandbox();

  it('marker matches the pinned sha256: no download, no build, no restart', () => {
    publishRelease('0.2.1');
    installedModel(PREBUILT, sha256(PREBUILT));
    publishModelAtDefaultTestUrl('would-be-new');
    const r = installWithGpuModelPinnedToPrebuilt(serverOn);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('al aanwezig');
    expect(r.out).not.toContain('downloaden');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(localBuildRuns()).toBe(0);
    expect(launcherServerStarts()).toBe(1);
  });

  it('pinned sha256 changed: installs the new model over the old one, writes the marker and restarts the server', () => {
    publishRelease('0.2.1');
    installedModel('old-encoder', sha256('old-encoder'));
    publishModelAtDefaultTestUrl();
    const r = installWithGpuModelPinnedToPrebuilt(serverOn);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Nieuwe versie van het GPU-spraakmodel downloaden');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(readFileSync(markerFile(), 'utf8').trim()).toBe(sha256(PREBUILT));
    expect(existsSync(partFile())).toBe(false);
    expect(localBuildRuns()).toBe(0);
    expect(launcherServerStarts()).toBe(2);
  });

  it('new model download fails: keeps the old model and marker, no build, no restart', () => {
    publishRelease('0.2.1');
    installedModel('old-encoder', sha256('old-encoder'));
    publishModelAtDefaultTestUrl('tampered-encoder');
    const r = installWithGpuModelPinnedToPrebuilt(serverOn);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Het huidige GPU-spraakmodel blijft in gebruik');
    expect(readFileSync(modelFile(), 'utf8')).toBe('old-encoder');
    expect(readFileSync(markerFile(), 'utf8').trim()).toBe(sha256('old-encoder'));
    expect(existsSync(partFile())).toBe(false);
    expect(localBuildRuns()).toBe(0);
    expect(launcherServerStarts()).toBe(1);
  });

  it('old install without a marker: replaces the model with the pinned one', () => {
    publishRelease('0.2.1');
    installedModel('locally-built-before-markers');
    publishModelAtDefaultTestUrl();
    const r = installWithGpuModelPinnedToPrebuilt();
    expect(r.code, r.out).toBe(0);
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(readFileSync(markerFile(), 'utf8').trim()).toBe(sha256(PREBUILT));
  });
});
