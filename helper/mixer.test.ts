import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * The helper's `Mixer` (Sources/Mixer.swift), which mixes the Mac's default
 * input into the system audio tap for Safari's Both mode, driven by
 * `Tests/MixerCheck` with a synthetic call and user. A built-in mic read raw
 * speaks at about -65 dBFS, 40 dB under the call on the tap and under the
 * speech gate's 0.001 minimum (`speech-gate.ts`): mixed in at that level, the
 * user's words were in the recording but never transcribed.
 *
 * Needs macOS with the Swift compiler; skipped elsewhere.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const canBuild = process.platform === 'darwin' && spawnSync('swiftc', ['--version']).status === 0;

interface SegmentLevels {
  segment: string;
  /** RMS of the call in the frames. */
  call: number;
  /** RMS of what the mic added to them. */
  mic: number;
  /** Largest mixed sample. */
  peak: number;
}

type Report = Record<'speakers' | 'headphones' | 'headset', SegmentLevels[]>;

let report: Report;

function seg(scenario: keyof Report, name: string): SegmentLevels {
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
      path.join(here, 'Tests/MixerCheck/main.swift'),
    ]);
    report = JSON.parse(execFileSync(bin, { encoding: 'utf8' })) as Report;
  }, 120_000);

  it('brings a quiet built-in mic up to where the speech gate and the model hear it', () => {
    // Raw, the user is 3.4e-4 RMS. On speakers the echo of the call caps
    // the gain lower; still five times the gate's minimum.
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
});
