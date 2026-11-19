// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PARAKEET_TDT_V3_WEBGPU } from '@/lib/asr/browser/model-manifest-parakeet';
import { LiveTranscript } from '@/components/meeting/LiveTranscript';
import type { Segment, Speaker } from './types';
import type { BleedOptions, Take } from './types/two-source-bleed';
import { consentAndCache } from './asr-test-cache';
import { installAsrTestLifecycle, loadWebgpuAsr } from './asr-test-setup';
import {
  REALISTIC_BLEED,
  bleedCopy,
  padded,
  spoken,
  toFrames,
  utterance,
} from './two-source-bleed.testSupport';

const engineState = await vi.hoisted(async () => (await import('./asr-test-engine-state')).createEngineState());

vi.mock('@/lib/asr/browser/parakeet', async () => ({
  BrowserASREngine: (await import('./asr-test-fake-engine')).createFakeEngine(engineState),
}));

installAsrTestLifecycle(engineState);
afterEach(cleanup);

const REMOTE = 'ik denk dat we dit volgende week moeten opleveren aan de klant';
const BLEED = 'Ik denk dat we dit volgende week moeten opleveren aan klant';
const SECONDS = 5;

async function transcribe(takes: Take[]): Promise<Segment[]> {
  const asr = await loadWebgpuAsr();
  await consentAndCache(PARAKEET_TDT_V3_WEBGPU);
  expect(await asr.ensureBrowserASRReady()).toBe(true);
  const store = { ...(await import('./session-reset')), ...(await import('./store-core')) };
  store.resetSession('both');
  for (const take of takes) {
    engineState.words = spoken(take.text, SECONDS);
    for (const frame of toFrames(take.audio)) asr.pushLiveAudio(take.source, frame);
    await asr.flushLiveAudio();
  }
  return store.getState().segments;
}

function transcriptView(segments: Segment[]) {
  const speakers: Record<string, Speaker> = {};
  for (const s of segments) {
    speakers[s.speaker] ??= {
      id: s.speaker,
      source: s.source,
      label: 'Frank Jongenotter',
      colorIndex: Object.keys(speakers).length,
    };
  }
  return render(
    <LiveTranscript
      segments={segments}
      speakers={speakers}
      status="live"
      autoScrollEnabled={false}
      onStartRecording={() => {}}
      modelReady
      onOpenSettings={() => {}}
    />,
  );
}

const remote = () => utterance(SECONDS);
const sameVoice = (opts: BleedOptions): Take[] => [
  { source: 'system', audio: padded(remote(), 0.2), text: REMOTE },
  { source: 'mic', audio: bleedCopy(padded(remote(), 0.2), opts), text: BLEED },
];

describe('one voice captured on both mic and system', () => {
  it.each([20, 150, 300])('renders one segment, one speaker, no side-by-side column at %i ms bleed delay', async (ms) => {
    const segments = await transcribe(sameVoice({ ...REALISTIC_BLEED, delayMs: ms }));
    const { container } = transcriptView(segments);
    expect(container.querySelectorAll('[data-overlap]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-seg-id]')).toHaveLength(1);
    expect(segments.map((s) => s.source).sort()).toEqual(['mic', 'system']);
    expect(container.querySelector('[data-seg-id]')!.textContent).toContain('aan de klant');
  });

  it('survives a quiet, noisy, echoey bleed copy', async () => {
    const quiet = { delayMs: 250, gain: 0.15, noiseLevel: 0.03, echoMs: 180 };
    const { container } = transcriptView(await transcribe(sameVoice(quiet)));
    expect(container.querySelectorAll('[data-overlap]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-seg-id]')).toHaveLength(1);
  });
});

describe('speech that is not an echo is kept', () => {
  it('shows two different voices talking over each other across sources as two columns', async () => {
    const other = 'nee wacht even ik was nog niet klaar met mijn verhaal over de planning';
    const segments = await transcribe([
      { source: 'system', audio: padded(remote(), 0.2), text: REMOTE },
      { source: 'mic', audio: padded(utterance(SECONDS, 0.3, 3), 0.7), text: other },
    ]);
    const { container } = transcriptView(segments);
    expect(container.querySelectorAll('[data-overlap]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-overlap-speaker]')).toHaveLength(2);
  });

  it('leaves a person heard on one source only untouched', async () => {
    const segments = await transcribe([{ source: 'mic', audio: padded(remote(), 0.2), text: REMOTE }]);
    const { container } = transcriptView(segments);
    expect(container.querySelectorAll('[data-seg-id]')).toHaveLength(1);
    expect(segments[0].source).toBe('mic');
  });

  it('keeps an interruption: a short different phrase cut into the middle of a long utterance', async () => {
    const segments = await transcribe([
      { source: 'system', audio: padded(remote(), 0.2), text: REMOTE },
      { source: 'mic', audio: padded(utterance(2, 0.3, 5), 1.5), text: 'sorry mag ik even iets zeggen' },
    ]);
    expect(segments.map((s) => s.source).sort()).toEqual(['mic', 'system']);
    const { container } = transcriptView(segments);
    expect(container.querySelectorAll('[data-seg-id]')).toHaveLength(2);
  });

  it('keeps similar wording that only partly overlaps in time (repeating yourself afterwards)', async () => {
    const segments = await transcribe([
      { source: 'system', audio: padded(remote(), 0.2), text: REMOTE },
      { source: 'mic', audio: padded(utterance(SECONDS, 0.3, 2), 4.5, 0), text: BLEED },
    ]);
    expect(segments.map((s) => s.source).sort()).toEqual(['mic', 'system']);
  });
});
