// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { EXTERNAL_REFERENCE, EXTERNAL_WAV, loadExternalCases } from './external-case';
import { writeWav16kMono } from './wav-io';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'echo-ext-case-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

function fixture(name: string, reference: unknown, wav = true): string {
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  if (wav) writeWav16kMono(path.join(dir, EXTERNAL_WAV), new Float32Array(1600));
  fs.writeFileSync(path.join(dir, EXTERNAL_REFERENCE), JSON.stringify(reference));
  return dir;
}

const TURNS = [
  { start: 0, end: 3, spk: 'B' },
  { start: 2.5, end: 6, spk: 'A', text: 'hoi' },
];

describe('loadExternalCases', () => {
  it('builds a system-only and a bleed variant named after the folder', () => {
    const cases = loadExternalCases(fixture('clip1', TURNS));
    expect(cases.map((c) => c.id)).toEqual(['clip1-ext-system', 'clip1-ext-bleed']);
    expect(cases[0].bleed).toBeNull();
    expect(cases[1].bleed).not.toBeNull();
    expect(cases[0]).toMatchObject({ split: 'heldout', lang: 'en', durationSec: 6 });
    expect(cases[0].speakers).toEqual([
      { id: 'A', role: 'remote', lang: 'en' },
      { id: 'B', role: 'remote', lang: 'en' },
    ]);
    expect(cases[1].turns).toEqual(cases[0].turns);
  });

  it('takes id and lang from an object reference', () => {
    const cases = loadExternalCases(fixture('clip2', { id: 'talk', lang: 'nl', turns: TURNS }));
    expect(cases.map((c) => [c.id, c.lang])).toEqual([
      ['talk-ext-system', 'nl'],
      ['talk-ext-bleed', 'nl'],
    ]);
  });

  it('rejects a folder without audio or with malformed turns', () => {
    expect(() => loadExternalCases(fixture('noaudio', TURNS, false))).toThrow(EXTERNAL_WAV);
    expect(() => loadExternalCases(fixture('bad', [{ start: 0, spk: 'A' }]))).toThrow('expected turns');
  });
});
