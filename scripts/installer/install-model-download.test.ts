import { existsSync, readFileSync } from 'node:fs';
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
} from './install-sandbox/model-install';
import { publishRelease } from './install-sandbox/publish-release';
import { installRoot, sandbox, useInstallSandbox, writeExecutable } from './install-sandbox/sandbox';

const repo = path.resolve(__dirname, '../..');

describe.skipIf(process.platform !== 'darwin')('install.sh prebuilt speech model', () => {
  useInstallSandbox();

  it('1. fresh install: downloads the model, checks its sha256, installs it and restarts the server', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl();
    const r = installWithGpuModelPinnedToPrebuilt({ MEETING_NOTER_RUN_SERVER: '1', MEETING_NOTER_PORT: '39517' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('GPU-spraakmodel gedownload');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(localBuildRuns()).toBe(0);
    expect(launcherServerStarts()).toBe(2);
  });

  it('2. sha256 mismatch: removes the download and builds on this Mac', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl('tampered-encoder');
    const r = installWithGpuModelPinnedToPrebuilt();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Controlesom van het GPU-spraakmodel klopt niet');
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
    expect(existsSync(partFile())).toBe(false);
    expect(localBuildRuns()).toBe(1);
  });

  it('3a. download fails with a 404 (missing asset): builds on this Mac', () => {
    publishRelease('0.2.1');
    const r = installWithGpuModelPinnedToPrebuilt();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Download van het GPU-spraakmodel mislukt');
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
    expect(localBuildRuns()).toBe(1);
  });

  it('3b. download fails without network (connection refused): builds on this Mac', () => {
    publishRelease('0.2.1');
    const r = installWithGpuModelPinnedToPrebuilt({ MEETING_NOTER_MODEL_URL: 'http://127.0.0.1:9/encoder-model.q4f16.onnx' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Download van het GPU-spraakmodel mislukt');
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
    expect(existsSync(partFile())).toBe(false);
  });

  it('4. truncated download: takes the sha256-mismatch path and leaves no partial file', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl(PREBUILT.slice(0, 5));
    const r = installWithGpuModelPinnedToPrebuilt();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Controlesom van het GPU-spraakmodel klopt niet');
    expect(existsSync(partFile())).toBe(false);
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
  });

  it('5. model already present (update run): neither downloads nor rebuilds', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl();
    expect(installWithGpuModelPinnedToPrebuilt().code).toBe(0);
    publishRelease('0.2.2');
    publishModelAtDefaultTestUrl('a-newer-encoder');
    const r = installWithGpuModelPinnedToPrebuilt();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('al aanwezig');
    expect(r.out).not.toContain('downloaden');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(localBuildRuns()).toBe(0);
  });

  it('6. --gpu-model retry: downloads again when the model is missing', () => {
    publishRelease('0.2.1');
    expect(installWithGpuModelPinnedToPrebuilt({}, { uvFails: true }).code).toBe(0);
    expect(existsSync(modelFile())).toBe(false);
    publishModelAtDefaultTestUrl();
    const r = installWithGpuModelPinnedToPrebuilt({}, { args: ['--gpu-model'] });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('GPU-spraakmodel gedownload');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
  });

  it('7. MEETING_NOTER_SKIP_GPU_MODEL=1: no download, no build', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl();
    const r = installWithGpuModelPinnedToPrebuilt({ MEETING_NOTER_SKIP_GPU_MODEL: '1' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toContain('GPU-spraakmodel');
    expect(existsSync(modelFile())).toBe(false);
    expect(localBuildRuns()).toBe(0);
  });

  it('8. download works with less than 8 GB RAM and less than 6 GB free disk', () => {
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl();
    writeExecutable(path.join(sandbox.shims, 'sysctl'), '#!/bin/sh\ncase "$*" in *hw.memsize*) echo 4294967296 ;; *) echo 1 ;; esac\n');
    const r = installWithGpuModelPinnedToPrebuilt({ MEETING_NOTER_MIN_DISK_KB: '99999999999' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toMatch(/werkgeheugen|schijfruimte/);
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
  });

  it('9. download and local build both fail: CPU-model message, install still succeeds', () => {
    publishRelease('0.2.1');
    const r = installWithGpuModelPinnedToPrebuilt({}, { uvFails: true });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('De app gebruikt het CPU-model');
    expect(existsSync(modelFile())).toBe(false);
    expect(existsSync(path.join(installRoot(), 'model-build'))).toBe(false);
  });

  it('11. installs the file at the exact URL path the app loads it from', () => {
    const manifest = readFileSync(path.join(repo, 'src/lib/asr/browser/model-manifest-parakeet.ts'), 'utf8');
    const appPath = /Q4F16_ENCODER_URL =[^']*'(\/models\/[^']+)'/.exec(manifest)?.[1];
    expect(appPath).toBe('/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx');
    publishRelease('0.2.1');
    publishModelAtDefaultTestUrl();
    expect(installWithGpuModelPinnedToPrebuilt().code).toBe(0);
    expect(readFileSync(path.join(installRoot(), 'app/server/public', appPath!), 'utf8')).toBe(PREBUILT);
  });
});
