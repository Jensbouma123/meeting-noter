import { describe, expect, it } from 'vitest';
import { AudioSpill } from './audio-spill';
import { RunSpiller } from './run-spiller';
import { fakeDirectory, fakeHandle } from './spill-test-support';

const owners = (spans: [number, number, number[]][]): Uint8Array => {
  const frames = Math.max(...spans.map(([, end]) => end));
  const q = new Uint8Array(frames * 2);
  for (const [start, end, channels] of spans) {
    for (let t = start; t < end; t += 1) for (const c of channels) q[t * 2 + c] = c === 1 ? 128 : 255;
  }
  return q;
};

const audio = (from: number, to: number) =>
  Float32Array.from({ length: to - from }, (_, i) => ((from + i) % 32000) / 32767);

async function setup() {
  const spill = await AudioSpill.open('r', { getDirectory: async () => fakeDirectory(fakeHandle()) });
  return { spill, spiller: new RunSpiller(spill, 2) };
}

const probs = owners([
  [0, 60, [0]],
  [60, 80, [1]],
  [80, 90, [0, 1]],
  [90, 200, [0]],
]);

describe('RunSpiller', () => {
  it('spills exclusive runs with a tail, rewinding short runs and skipping overlap', async () => {
    const { spill, spiller } = await setup();
    const total = 200 * 160 + 240;
    for (let s = 0, b = 0; s < total || b < 200; s += 1234, b += 37) {
      if (s < total) spiller.pushAudio(audio(s, Math.min(total, s + 1234)));
      if (b < 200) spiller.pushProbs(probs.subarray(b * 2, Math.min(200, b + 37) * 2));
    }
    spiller.finish();
    expect(spill.runs).toEqual([
      { channel: 0, startFrame: 0, endFrame: 60, offset: 0, length: 60 * 160 + 240 },
      { channel: 0, startFrame: 90, endFrame: 200, offset: 60 * 160 + 240, length: 110 * 160 + 240 },
    ]);
    expect(spill.length).toBe(170 * 160 + 480);
    const window = await spill.readWindow({ channel: 0, start: 100, end: 110 });
    expect(window[0]).toBe(100 * 160);
    expect(window[window.length - 1]).toBe(110 * 160 + 239);
  });

  it('waits for audio to cover the frame plus tail before processing it', async () => {
    const { spill, spiller } = await setup();
    spiller.pushProbs(probs);
    spiller.pushAudio(audio(0, 49 * 160 + 239));
    expect(spill.length).toBe(49 * 160);
    spiller.pushAudio(audio(49 * 160 + 239, 49 * 160 + 240));
    expect(spill.length).toBe(50 * 160);
  });

  it('closes the open run on finish with whatever tail audio exists', async () => {
    const { spill, spiller } = await setup();
    spiller.pushAudio(audio(0, 200 * 160));
    spiller.pushProbs(probs);
    spiller.finish();
    expect(spill.runs[1]).toEqual({ channel: 0, startFrame: 90, endFrame: 200, offset: 9840, length: 110 * 160 });
  });

  it('rounds and clamps float audio to Int16', async () => {
    const { spill, spiller } = await setup();
    spiller.pushProbs(owners([[0, 60, [0]]]));
    spiller.pushAudio(Float32Array.from({ length: 60 * 160 }, (_, i) => (i === 0 ? 2 : i === 1 ? -0.5 : 0)));
    spiller.finish();
    const out = await spill.readWindow({ channel: 0, start: 0, end: 1 });
    expect(Array.from(out.subarray(0, 2))).toEqual([32767, -16383]);
  });
});
