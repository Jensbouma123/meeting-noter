import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox, writeExecutable } from './install-sandbox/sandbox';

const ENCODER = 'parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';
const PREBUILT = 'prebuilt-encoder';
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe.skipIf(process.platform !== 'darwin')('install.sh prebuilt speech model download', () => {
  useInstallSandbox();

  const modelFile = () => path.join(installRoot(), 'models', ENCODER);
  const uvCalls = () => path.join(sandbox.home, 'uv-calls');
  function install(env: Record<string, string> = {}) {
    const uv = path.join(sandbox.dir, 'fake-uv');
    writeExecutable(uv, `#!/bin/bash\nwhile [ $# -gt 0 ]; do [ "$1" = --outdir ] && out=$2; shift; done\necho run >> "$HOME/uv-calls"\nmkdir -p "$out"; printf converted > "$out/encoder-model.q4f16.onnx"\n`);
    return runScript(INSTALL, { MEETING_NOTER_UV: uv, MEETING_NOTER_SKIP_GPU_MODEL: '', MEETING_NOTER_MODEL_SHA256: sha256(PREBUILT), ...env });
  }
  const publishModel = (body = PREBUILT) => writeFileSync(path.join(sandbox.base, 'encoder-model.q4f16.onnx'), body);

  it('installs the prebuilt model when its sha256 matches the pin, without building', () => {
    publishRelease('0.2.1');
    publishModel();
    const r = install();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('GPU-spraakmodel gedownload');
    expect(readFileSync(modelFile(), 'utf8')).toBe(PREBUILT);
    expect(existsSync(uvCalls())).toBe(false);
    expect(existsSync(path.join(installRoot(), 'model-download.part'))).toBe(false);
  });

  it('builds on this Mac when the downloaded model does not match the pinned sha256', () => {
    publishRelease('0.2.1');
    publishModel('tampered-encoder');
    const r = install();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Controlesom van het GPU-spraakmodel klopt niet');
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
    expect(readFileSync(uvCalls(), 'utf8').trim().split('\n')).toHaveLength(1);
    expect(existsSync(path.join(installRoot(), 'model-download.part'))).toBe(false);
  });

  it('builds on this Mac when the download fails', () => {
    publishRelease('0.2.1');
    const r = install();
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Download van het GPU-spraakmodel mislukt');
    expect(readFileSync(modelFile(), 'utf8')).toBe('converted');
    expect(readFileSync(uvCalls(), 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('neither downloads nor builds with MEETING_NOTER_SKIP_GPU_MODEL', () => {
    publishRelease('0.2.1');
    publishModel();
    const r = install({ MEETING_NOTER_SKIP_GPU_MODEL: '1' });
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toContain('GPU-spraakmodel');
    expect(existsSync(modelFile())).toBe(false);
    expect(existsSync(uvCalls())).toBe(false);
  });
});
