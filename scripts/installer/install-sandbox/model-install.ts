import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runScript } from './run-script';
import { INSTALL, installRoot, sandbox, writeExecutable } from './sandbox';

export const PREBUILT = 'prebuilt-encoder';
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const modelFile = () => path.join(installRoot(), 'models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx');
export const partFile = () => path.join(installRoot(), 'model-download.part');

/** Lines the fake uv wrote: one per local build. */
export function uvRuns() {
  const file = path.join(sandbox.home, 'uv-calls');
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').length : 0;
}

/** Server starts recorded by the fake release's launcher. */
export function serverStarts() {
  const file = path.join(sandbox.home, 'starts');
  return existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').length : 0;
}

/** Puts `body` where the default MEETING_NOTER_MODEL_URL points. */
export const publishModel = (body = PREBUILT) => writeFileSync(path.join(sandbox.base, 'encoder-model.q4f16.onnx'), body);

/** Runs install.sh with the GPU model on, the prebuilt pin set to PREBUILT and a fake uv that builds "converted" (or fails). */
export function installWithModel(env: Record<string, string> = {}, { uvFails = false, args = [] as string[] } = {}) {
  const uv = path.join(sandbox.dir, 'fake-uv');
  const build = uvFails ? 'echo boom >&2; exit 1' : 'mkdir -p "$out"; printf converted > "$out/encoder-model.q4f16.onnx"';
  writeExecutable(uv, `#!/bin/bash\nwhile [ $# -gt 0 ]; do [ "$1" = --outdir ] && out=$2; shift; done\necho run >> "$HOME/uv-calls"\n${build}\n`);
  return runScript(INSTALL, { MEETING_NOTER_UV: uv, MEETING_NOTER_SKIP_GPU_MODEL: '', MEETING_NOTER_MODEL_SHA256: sha256(PREBUILT), ...env }, args);
}
