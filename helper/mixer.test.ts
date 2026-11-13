import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { MixerReport, SegmentLevels } from './types';
const here = path.dirname(fileURLToPath(import.meta.url));
const canBuild = process.platform === 'darwin' && spawnSync('swiftc', ['--version']).status === 0;

let report: MixerReport;

function seg(scenario: keyof MixerReport, name: string): SegmentLevels {
  const found = report[scenario].find((s) => s.segment === name);
  if (!found) throw new Error(`no ${scenario}/${name} segment`);
  return found;
}

describe.skipIf(!canBuild)('helper mixer: the mic mixed into the system audio', () => {
  beforeAll(() => {
    const bin = path.join(mkdtempSync(path.join(tmpdir(), 'mixer-check-')), 'mixer-check');
    execFileSync('swiftc', [
      '-O',
      '-swift-version', '5',
      '-o', bin,
      path.join(here, 'Sources/Mixer.swift'),
      path.join(here, 'Sources/Downsampler.swift'),
      path.join(here, 'Sources/Framer.swift'),
      path.join(here, 'Sources/MicLeveler.swift'),
      path.join(here, 'Sources/SoloMic.swift'),
      path.join(here, 'Tests/MixerCheck/Segment.swift'),
      path.join(here, 'Tests/MixerCheck/main.swift'),
    ]);
    report = JSON.parse(execFileSync(bin, { encoding: 'utf8' })) as MixerReport;
  }, 120_000);

  it('brings a quiet built-in mic up to where the speech gate and the model hear it', () => {
    expect(seg('headphones', 'user').mic).toBeGreaterThan(0.015);
    expect(seg('speakers', 'user').mic).toBeGreaterThan(0.005);
  });

  it('keeps the user audible while the call talks over them', () => {
    expect(seg('speakers', 'both').mic).toBeGreaterThan(0.01);
  });

  it('keeps what the mic hears of the speakers at least 18 dB under the call', () => {
    for (const name of ['call', 'call again']) {
      const s = seg('speakers', name);
      expect(s.mic / s.call).toBeLessThan(0.125);
    }
  });

  it('leaves a mic that is already loud (a headset) at its level, without clipping', () => {
    const user = seg('headset', 'user');
    expect(user.mic).toBeGreaterThan(0.05);
    expect(user.mic).toBeLessThan(0.15);
    expect(seg('headset', 'both').peak).toBeLessThan(1);
  });

  it('raises a quiet built-in mic streamed alone, and leaves a headset unclipped', () => {
    expect(seg('alone', 'built-in').mic).toBeGreaterThan(0.015);
    expect(seg('alone', 'headset').mic).toBeGreaterThan(0.05);
    expect(seg('alone', 'headset').peak).toBeLessThan(1);
  });
});
