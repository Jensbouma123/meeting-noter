// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import { afterAll, describe, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { consentAndCache } from '@/lib/meeting/asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from '@/lib/meeting/asr-test-setup';
import { AUDIO_DIR, OUT_DIR, RESULTS_FILE } from './out-dir';
import { buildCases } from './lib/cases';
import { sampleDev } from './lib/sample';
import { renderCase } from './lib/render-case';
import { runCase } from './lib/run-case';
import { loadUtterances } from './lib/utterances';
import { writeReport } from './lib/report';
import type { CaseResult } from './types/case-result';

const engineState = await vi.hoisted(async () => (await import('@/lib/meeting/asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./lib/real-engine')).createRealEngine(engineState),
}));

installAsrTestLifecycle(engineState);

const utts = loadUtterances(AUDIO_DIR);
const byId = new Map(utts.map((u) => [u.id, u]));
const limit = Number(process.env.ECHO_EVAL_LIMIT) || Infinity;
const devSample = Number(process.env.ECHO_EVAL_DEV_SAMPLE) || 0;
const planned = devSample ? sampleDev(buildCases(utts), devSample) : buildCases(utts);
const cases = planned.slice(0, limit);
const done = new Set(
  fs.existsSync(RESULTS_FILE)
    ? fs.readFileSync(RESULTS_FILE, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as CaseResult).id)
    : [],
);

describe.skipIf(process.env.ECHO_EVAL_SET === 'meetings')(`echo bleed eval (${utts.length} utterances, ${cases.length} cases)`, () => {
  afterAll(() => writeReport(OUT_DIR, RESULTS_FILE, utts.length));
  it.each(cases.filter((c) => !done.has(c.id)))('$id', async (c) => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    await asr.ensureBrowserASRReady();
    const store = { ...(await import('@/lib/meeting/session-reset')), ...(await import('@/lib/meeting/store-core')) };
    const result = await runCase(c, renderCase(c, byId), asr, store);
    fs.appendFileSync(RESULTS_FILE, JSON.stringify(result) + '\n');
  });
});
