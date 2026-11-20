import { afterEach, describe, expect, it } from 'vitest';
import { clearEchoAudio, pushEchoAudio } from './echo/echo-store';
import { publishLiveUpdate } from './speaker-attribution';
import * as storeSegmentStore from './segment-store';
import * as storeSessionReset from './session-reset';
import * as storeStoreCore from './store-core';
import { splitTranscript } from './split-transcript';
import type { SpeakerTimeline } from './types/asr-speaker';

const SR = 16_000;
const TOTAL = 9 * SR;

function noise(seed: number, samples: number): Float32Array {
  let s = seed;
  return Float32Array.from({ length: samples }, () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648 - 0.5;
  });
}

function bursts(seed: number, from: number, to: number, modHz: number): Float32Array {
  const out = new Float32Array(TOTAL);
  const src = noise(seed, TOTAL);
  for (let i = Math.round(from * SR); i < Math.round(to * SR); i += 1) {
    out[i] = src[i] * (0.5 + 0.5 * Math.sin((2 * Math.PI * modHz * i) / SR));
  }
  return out;
}

const speaker = (_: unknown, start: number) => (start < 4 ? 'mic:0' : 'mic:1');
const timeline: SpeakerTimeline = {
  speakerFor: speaker,
  speakerNear: speaker,
  changePoints: () => [4],
  turnEnds: () => [4, 8],
};

function word(text: string, start: number, end: number) {
  return { text, start: Math.round(start * SR), end: Math.round(end * SR) };
}

afterEach(() => {
  storeSessionReset.resetSession('mic');
  clearEchoAudio();
});

describe('the echo verdict on a mic segment the diarizer splits', () => {
  it('drops the echo piece and keeps the local piece', () => {
    const system = bursts(1, 0.5, 6, 3);
    const local = bursts(2, 4, 8, 4.7);
    const lag = Math.round(0.15 * SR);
    const mic = local.map((v, i) => v * 0.6 + (i >= lag ? 0.3 * system[i - lag] : 0) + (i % 7) * 0.0003);
    pushEchoAudio('system', system, 0);
    pushEchoAudio('mic', mic, 0);
    storeSegmentStore.upsertSegment({
      id: 'sys-1',
      source: 'system',
      speaker: 'system:0',
      text: 'the quarterly numbers look fine to me',
      start: 0.5,
      end: 6,
      final: true,
    });
    publishLiveUpdate(
      'mic',
      {
        id: 'mic-1',
        text: 'echo head copy here local tail talk now',
        startSample: Math.round(0.6 * SR),
        endSample: Math.round(7.8 * SR),
        final: true,
        words: [
          word('echo', 0.6, 1.4),
          word('head', 1.5, 2.3),
          word('copy', 2.4, 3.1),
          word('here', 3.2, 3.9),
          word('local', 4.1, 5),
          word('tail', 5.1, 6),
          word('talk', 6.1, 6.9),
          word('now', 7, 7.8),
        ],
      },
      timeline,
      () => 'mic:0',
    );
    const kept = splitTranscript(storeStoreCore.getState().segments)
      .flatMap((b) => b.segments)
      .filter((s) => s.source === 'mic')
      .map((s) => s.text);
    expect(kept).toEqual(['local tail talk now']);
  });
});
