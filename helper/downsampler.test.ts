import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { DownsamplerReport } from './types';
import { Resampler } from '../public/worklets/resampler.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const canBuild = process.platform === 'darwin' && spawnSync('swiftc', ['--version']).status === 0;

let report: DownsamplerReport;

function browserMix(): number[] {
  const resampler = new Resampler(44100);
  const out: number[] = [];
  for (let n = 0; n < 4410; n++) {
    const t = n / 44100;
    const x = 0.3 * Math.sin(2 * Math.PI * 440 * t) + 0.2 * Math.sin(2 * Math.PI * 9000 * t) + 0.1 * Math.sin(2 * Math.PI * 15000 * t);
    resampler.push(Math.fround(x), (y: number) => out.push(y));
  }
  return out;
}

describe.skipIf(!canBuild)('helper downsampler: anti-alias low-pass to 16 kHz', () => {
  beforeAll(() => {
    const bin = path.join(mkdtempSync(path.join(tmpdir(), 'downsampler-check-')), 'downsampler-check');
    execFileSync('swiftc', [
      '-O',
      '-swift-version', '5',
      '-o', bin,
      path.join(here, 'Sources/Downsampler.swift'),
      path.join(here, 'Tests/DownsamplerCheck/main.swift'),
    ]);
    report = JSON.parse(execFileSync(bin, { encoding: 'utf8' })) as DownsamplerReport;
  }, 120_000);

  it('keeps tones above 8 kHz out of the output', () => {
    for (const key of ['48000/9000', '48000/12000', '48000/20000', '44100/9000', '44100/12000', '44100/20000']) {
      expect(report.gains[key], key).toBeLessThan(-60);
    }
  });

  it('passes speech frequencies intact, from 48, 44.1 and 8 kHz', () => {
    for (const key of ['48000/1000', '48000/3000', '48000/6000', '44100/1000', '44100/6000', '8000/1000']) {
      expect(Math.abs(report.gains[key]), key).toBeLessThan(0.1);
    }
  });

  it('resamples sample for sample as the browser worklet does', () => {
    const browser = browserMix();
    expect(report.mix.length).toBe(browser.length);
    const worst = Math.max(...report.mix.map((y, i) => Math.abs(y - browser[i])));
    expect(worst).toBeLessThan(1e-5);
  });
});
