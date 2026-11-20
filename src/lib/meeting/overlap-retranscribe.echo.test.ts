import { afterEach, describe, expect, it } from 'vitest';
import { clearEchoAudio, pushEchoAudio } from './echo/echo-store';
import { isOverlapPassSegment } from './overlap-pass-segments';
import { flushOverlapRetranscribe, noteOverlapTurns, setOverlapTranscriber } from './overlap-retranscribe';
import { SR, pushSeconds, resetOverlapState, turns } from './overlap-retranscribe.testSupport';
import * as storeSegmentStore from './segment-store';
import * as storeStoreCore from './store-core';
import { splitTranscript } from './split-transcript';

const TOTAL = 7 * SR;

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

const system = bursts(1, 1, 5, 3);
const floor = noise(9, TOTAL).map((v) => v * 0.002);

async function keptPassText(mic: Float32Array): Promise<string[]> {
  pushEchoAudio('system', system, 0);
  pushEchoAudio('mic', mic, 0);
  storeSegmentStore.upsertSegment({
    id: 'sys-1',
    source: 'system',
    speaker: 'system:0',
    text: 'the quarterly numbers look fine to me',
    start: 1,
    end: 5,
    final: true,
  });
  setOverlapTranscriber(async () => [
    { text: 'het', start: 0.3, end: 0.7 },
    { text: 'was', start: 0.75, end: 1.2 },
  ]);
  pushSeconds(0, 6);
  noteOverlapTurns('mic', turns);
  await flushOverlapRetranscribe();
  const pass = storeStoreCore.getState().segments.filter((s) => isOverlapPassSegment(s.id));
  expect(pass.map((s) => s.text)).toEqual(['het was']);
  return splitTranscript(storeStoreCore.getState().segments)
    .flatMap((b) => b.segments)
    .filter((s) => isOverlapPassSegment(s.id))
    .map((s) => s.text);
}

afterEach(() => {
  resetOverlapState();
  clearEchoAudio();
});

describe('the live second pass on mic bleed', () => {
  it('drops a mic overlap fragment that is a delayed copy of the system audio', async () => {
    const lag = Math.round(0.15 * SR);
    const mic = floor.map((v, i) => v + (i >= lag ? 0.3 * system[i - lag] : 0));
    expect(await keptPassText(mic)).toEqual([]);
  });

  it('keeps a mic overlap fragment the local speaker says over the remote one', async () => {
    const talk = bursts(2, 2.5, 4.5, 4.7);
    const mic = floor.map((v, i) => v + talk[i] * 0.6);
    expect(await keptPassText(mic)).toEqual(['het was']);
  });
});
