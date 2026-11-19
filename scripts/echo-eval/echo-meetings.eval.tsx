// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { consentAndCache } from '@/lib/meeting/asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from '@/lib/meeting/asr-test-setup';
import { AUDIO_DIR, OUT_DIR, meetingResultsFile } from './out-dir';
import { buildMeetings } from './lib/meeting-plan';
import { writeMeetingReport } from './lib/meeting-report';
import { renderMeeting } from './lib/meeting-render';
import { runMeeting } from './lib/run-meeting';
import { loadUtterances } from './lib/utterances';
import type { MeetingResult } from './types/meeting-result';

const engineState = await vi.hoisted(async () => (await import('@/lib/meeting/asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./lib/real-engine')).createRealEngine(engineState),
}));

installAsrTestLifecycle(engineState);

const enabled = process.env.ECHO_EVAL_SET === 'meetings';
const utts = enabled ? loadUtterances(AUDIO_DIR) : [];
const byId = new Map(utts.map((u) => [u.id, u]));
const file = meetingResultsFile(false);
const devOnly = process.env.ECHO_EVAL_MEETING_SPLIT !== 'all';
const limit = Number(process.env.ECHO_EVAL_LIMIT) || Infinity;
const cases = enabled ? buildMeetings(utts).filter((c) => !devOnly || c.split === 'dev').slice(0, limit) : [];
const done = new Set(
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => (JSON.parse(l) as MeetingResult).id) : [],
);

describe.skipIf(!enabled)(`meeting eval (${cases.length} meetings)`, () => {
  afterAll(() => writeMeetingReport(path.resolve(OUT_DIR), file, utts));
  it.each(cases.filter((c) => !done.has(c.id)))('$id', async (c) => {
    const asr = await loadWebgpuAsr();
    await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
    await asr.ensureBrowserASRReady();
    const store = { ...(await import('@/lib/meeting/session-reset')), ...(await import('@/lib/meeting/store-core')) };
    fs.appendFileSync(file, JSON.stringify(await runMeeting(c, renderMeeting(c, byId), asr, store)) + '\n');
  });
});
