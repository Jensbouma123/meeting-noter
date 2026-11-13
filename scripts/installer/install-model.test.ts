import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { publishRelease } from './install-sandbox/publish-release';
import { runScript } from './install-sandbox/run-script';
import { INSTALL, installRoot, sandbox, useInstallSandbox, writeExecutable } from './install-sandbox/sandbox';

const ENCODER = 'parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';

describe.skipIf(process.platform !== 'darwin')('install.sh speech model', () => {
  useInstallSandbox();

  function fakeUv(body: string) {
    const file = path.join(sandbox.dir, 'fake-uv');
    writeExecutable(file, `#!/bin/bash\nall="$*"\nwhile [ $# -gt 0 ]; do [ "$1" = --outdir ] && out=$2; shift; done\n${body}\n`);
    return file;
  }
  const modelFile = () => path.join(installRoot(), 'models', ENCODER);
  const servedModelFile = () => path.join(installRoot(), 'app/server/public/models', ENCODER);

  it('builds the speech model on this Mac, keeps it across updates and links it into public/models', () => {
    publishRelease('0.2.1');
    const uv = fakeUv('mkdir -p "$out"; echo "$all" >> "$HOME/uv-calls"; printf fake-encoder > "$out/encoder-model.q4f16.onnx"');
    const env = { MEETING_NOTER_UV: uv, MEETING_NOTER_SKIP_GPU_MODEL: '' };
    const first = runScript(INSTALL, env);
    expect(first.code, first.out).toBe(0);
    expect(readFileSync(modelFile(), 'utf8')).toBe('fake-encoder');
    expect(readFileSync(path.join(sandbox.home, 'uv-calls'), 'utf8')).toMatch(/--python 3\.12 --with numpy==.* --with onnx==.* --with onnxruntime==.*convert-parakeet-v3\.py/);
    expect(existsSync(path.join(installRoot(), 'model-build'))).toBe(false);
    expect(readFileSync(servedModelFile(), 'utf8')).toBe('fake-encoder');
    publishRelease('0.2.2');
    const second = runScript(INSTALL, env);
    expect(second.code, second.out).toBe(0);
    expect(second.out).toContain('al aanwezig');
    expect(readFileSync(path.join(sandbox.home, 'uv-calls'), 'utf8').trim().split('\n')).toHaveLength(1);
    expect(readFileSync(servedModelFile(), 'utf8')).toBe('fake-encoder');
  });

  it('keeps the CPU model and still installs when the conversion fails or the disk is too full', () => {
    publishRelease('0.2.1');
    const failing = runScript(INSTALL, { MEETING_NOTER_UV: fakeUv('echo boom >&2; exit 1'), MEETING_NOTER_SKIP_GPU_MODEL: '' });
    expect(failing.code, failing.out).toBe(0);
    expect(failing.out).toContain('CPU-model');
    expect(existsSync(modelFile())).toBe(false);
    expect(existsSync(path.join(installRoot(), 'model-build'))).toBe(false);
    const full = runScript(INSTALL, {
      MEETING_NOTER_UV: fakeUv('exit 0'),
      MEETING_NOTER_SKIP_GPU_MODEL: '',
      MEETING_NOTER_MIN_DISK_KB: '99999999999',
      MEETING_NOTER_FORCE: '1',
    });
    expect(full.code, full.out).toBe(0);
    expect(full.out).toContain('schijfruimte');
  });
});
