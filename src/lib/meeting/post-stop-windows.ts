import { CHUNK_SAMPLES, POST_STOP_SAMPLE_RATE } from './post-stop-constants';

const WINDOW_OVERLAP_SAMPLES = Math.floor(POST_STOP_SAMPLE_RATE * 0.5);

export function chunkedAudio(samples: Int16Array, chunkSamples = CHUNK_SAMPLES): Float32Array[] {
  if (samples.length === 0) return [];
  return [...chunkWindows(samples, chunkSamples)];
}

export function* chunkWindows(samples: Int16Array, chunkSamples = CHUNK_SAMPLES): Generator<Float32Array> {
  for (let start = 0; start < samples.length; start += chunkSamples) {
    const from = Math.max(0, start - WINDOW_OVERLAP_SAMPLES);
    const to = Math.min(samples.length, start + chunkSamples);
    yield floatChunk(samples.subarray(from, to));
  }
}

export function* chunkWindowsFromChunks(
  chunks: Int16Array[],
  chunkSamples = CHUNK_SAMPLES,
): Generator<{ window: Float32Array; startSample: number }> {
  let remaining = 0;
  for (const chunk of chunks) remaining += chunk.length;
  let tail = new Int16Array(0);
  let index = 0;
  let offset = 0;
  let consumed = 0;
  while (remaining > 0) {
    const bodyLength = Math.min(chunkSamples, remaining);
    const window = new Float32Array(tail.length + bodyLength);
    for (let i = 0; i < tail.length; i += 1) window[i] = tail[i] / 32768;
    let at = tail.length;
    let need = bodyLength;
    while (need > 0) {
      const chunk = chunks[index];
      const take = Math.min(need, chunk.length - offset);
      for (let i = 0; i < take; i += 1) window[at + i] = chunk[offset + i] / 32768;
      at += take;
      need -= take;
      offset += take;
      if (offset >= chunk.length) {
        chunks[index] = new Int16Array(0);
        index += 1;
        offset = 0;
      }
    }
    const keep = Math.min(WINDOW_OVERLAP_SAMPLES, window.length);
    const nextTail = new Int16Array(keep);
    for (let i = 0; i < keep; i += 1) {
      nextTail[i] = Math.round(window[window.length - keep + i] * 32768);
    }
    yield { window, startSample: consumed - tail.length };
    tail = nextTail;
    consumed += bodyLength;
    remaining -= bodyLength;
  }
  chunks.length = 0;
}

export function floatChunk(samples: Int16Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = samples[i] / 32768;
  }
  return out;
}
