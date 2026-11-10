import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHUNK_SAMPLES,
  MAX_BUFFERED_SAMPLES_PER_SOURCE,
  appendPostStopAudio,
  bufferedSeconds,
  chunkWindows,
  chunkWindowsFromChunks,
  getPostStopProgress,
  resetPostStopTranscriptionForTests,
  transcribeRecordedAudio,
} from './post-stop-transcription';

function ramp(length: number, start = 0): Int16Array {
  const out = new Int16Array(length);
  for (let i = 0; i < length; i += 1) out[i] = ((start + i) % 30000) - 15000;
  return out;
}

function split(samples: Int16Array, size: number): Int16Array[] {
  const out: Int16Array[] = [];
  for (let i = 0; i < samples.length; i += size) out.push(samples.slice(i, i + size));
  return out;
}

beforeEach(() => resetPostStopTranscriptionForTests());

describe('chunkWindowsFromChunks', () => {
  it('yields the same windows as the flattened array, overlap at boundaries included', () => {
    const chunkSamples = 20000;
    const flat = ramp(50000);
    const expected = [...chunkWindows(flat, chunkSamples)];
    const got = [...chunkWindowsFromChunks(split(flat, 3333), chunkSamples)];
    expect(got).toHaveLength(expected.length);
    got.forEach((entry, i) => {
      expect(Array.from(entry.window)).toEqual(Array.from(expected[i]));
    });
    expect(got.map((g) => g.startSample)).toEqual([0, 12000, 32000]);
  });

  it('releases each frame once consumed', () => {
    const chunks = split(ramp(50000), 5000);
    const gen = chunkWindowsFromChunks(chunks, 20000);
    gen.next();
    expect(chunks[0].length).toBe(0);
    expect(chunks[1].length).toBe(0);
    expect(chunks[3].length).toBe(0);
    expect(chunks[4].length).toBe(5000);
  });
});

describe('appendPostStopAudio', () => {
  it('keeps the newest audio when the cap is hit and reports the dropped seconds', () => {
    const frame = new Int16Array(16000 * 60).fill(1).buffer;
    const frames = Math.ceil(MAX_BUFFERED_SAMPLES_PER_SOURCE / 16000 / 60);
    for (let i = 0; i < frames; i += 1) appendPostStopAudio('mic', frame.slice(0));
    const marker = new Int16Array(16000 * 60).fill(7);
    appendPostStopAudio('mic', marker.buffer);
    expect(getPostStopProgress().droppedSeconds).toBeGreaterThan(0);
    expect(bufferedSeconds().mic).toBeCloseTo((frames + 1) * 60, 5);
  });
});

describe('transcribeRecordedAudio', () => {
  it('continues past a failing window and advances chunksDone while running', async () => {
    const samples = CHUNK_SAMPLES * 3 + 10; // 4 windows
    appendPostStopAudio('mic', ramp(samples).buffer as ArrayBuffer);
    const calls: number[] = [];
    const seen: number[] = [];
    const ok = await transcribeRecordedAudio(async (_a, _s, _f, start) => {
      seen.push(getPostStopProgress().chunksDone);
      calls.push(start);
      if (calls.length === 2) throw new Error('boom');
    });
    expect(ok).toBe(false);
    expect(calls).toHaveLength(4);
    expect(seen).toEqual([0, 1, 2, 3]);
    expect(getPostStopProgress().phase).toBe('error');
    expect(getPostStopProgress().error).toBe('boom');
    expect(getPostStopProgress().chunksDone).toBe(4);
  });

  it('reports recording-relative start samples offset by dropped audio', async () => {
    appendPostStopAudio('mic', ramp(100).buffer as ArrayBuffer);
    const starts: number[] = [];
    await transcribeRecordedAudio(async (_a, _s, _f, start) => {
      starts.push(start);
    });
    expect(starts).toEqual([0]);
  });
});
