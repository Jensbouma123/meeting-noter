import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CorpusEntry } from '../types/corpus-entry';
import type { Utterance } from '../types/utterance';
import { CROSSTALK_PER_SPLIT, ECHO_PER_SPLIT, buildCases } from './cases';
import { factorsOf, langOf } from './factors';
import { hashString } from './rng';
import { sampleDev } from './sample';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../corpus-manifest.json'), 'utf8')) as CorpusEntry[];
const utts: Utterance[] = manifest.map((e) => ({
  id: e.id,
  speaker: e.speaker,
  seconds: e.seconds,
  split: hashString(e.id) % 2 === 0 ? 'dev' : 'heldout',
  audio: new Float32Array(0),
}));
const cases = buildCases(utts);
const asResult = (c: (typeof cases)[number]) => ({ kind: c.kind, bleed: c.bleed });

describe('corpus manifest', () => {
  it('is large, multi-speaker, mostly Dutch and openly licensed', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(100);
    expect(new Set(manifest.map((m) => m.speaker)).size).toBeGreaterThanOrEqual(20);
    expect(manifest.filter((m) => m.language === 'nl').length / manifest.length).toBeGreaterThanOrEqual(0.5);
    expect(manifest.every((m) => m.license === 'CC-BY-4.0' && langOf(m.id) === m.language)).toBe(true);
  });

  it('has Dutch and English utterances in both splits', () => {
    for (const split of ['dev', 'heldout'] as const) {
      for (const lang of ['nl', 'en'] as const) {
        expect(utts.filter((u) => u.split === split && langOf(u.id) === lang).length).toBeGreaterThan(10);
      }
    }
  });
});

describe('case plan', () => {
  it('meets the size targets with unique ids', () => {
    expect(cases.filter((c) => c.kind === 'echo').length).toBe(2 * ECHO_PER_SPLIT);
    expect(cases.filter((c) => c.kind === 'crosstalk').length).toBeGreaterThanOrEqual(0.95 * 2 * CROSSTALK_PER_SPLIT);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it('keeps dev and held-out disjoint by system utterance', () => {
    const split = new Map(utts.map((u) => [u.id, u.split]));
    expect(cases.every((c) => split.get(c.systemUtt) === c.split && (!c.micUtt || split.get(c.micUtt) === c.split))).toBe(true);
  });

  it('covers every language pair in both splits and every factor often enough', () => {
    for (const split of ['dev', 'heldout']) {
      const cross = cases.filter((c) => c.kind === 'crosstalk' && c.split === split);
      for (const pair of ['nl-nl', 'nl-en', 'en-nl', 'en-en']) {
        expect(cross.filter((c) => `${langOf(c.systemUtt)}-${langOf(c.micUtt)}` === pair).length).toBeGreaterThan(10);
      }
    }
    const echo = cases.filter((c) => c.kind === 'echo');
    for (const f of ['clipping', 'compression', 'clock drift', 'AEC residual', 'linear bleed only']) {
      expect(echo.filter((c) => factorsOf(asResult(c)).includes(f)).length).toBeGreaterThan(100);
    }
    expect(cases.filter((c) => c.kind === 'crosstalk' && c.bleed).length).toBeGreaterThan(200);
  });
});

describe('dev sample', () => {
  it('is dev only, stratified by kind and language', () => {
    const sample = sampleDev(cases, 120);
    expect(sample).toHaveLength(120);
    expect(sample.every((c) => c.split === 'dev')).toBe(true);
    expect(sample.filter((c) => c.kind === 'crosstalk').length).toBeGreaterThan(20);
    expect(sample.filter((c) => langOf(c.systemUtt) === 'nl').length).toBeGreaterThan(40);
    expect(sample.filter((c) => langOf(c.systemUtt) === 'en').length).toBeGreaterThan(20);
  });
});
