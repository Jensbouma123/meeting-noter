export const SAMPLE_RATE = 16000;
const WINDOW = 20 * SAMPLE_RATE;
const HOP = 16 * SAMPLE_RATE;

export async function transcribeInOverlappingWindows(model, audio) {
  const out = [];
  let ms = 0;
  for (let from = 0; from < audio.length; from += HOP) {
    const to = Math.min(audio.length, from + WINDOW);
    const t0 = performance.now();
    const result = await model.transcribe(audio.subarray(from, to), SAMPLE_RATE, { returnTimestamps: true, enableProfiling: false });
    ms += performance.now() - t0;
    const keepFrom = from === 0 ? -Infinity : (from + (WINDOW - HOP) / 2) / SAMPLE_RATE;
    const keepTo = to >= audio.length ? Infinity : (from + HOP + (WINDOW - HOP) / 2) / SAMPLE_RATE;
    for (const w of result.words ?? []) {
      const mid = from / SAMPLE_RATE + (w.start_time + w.end_time) / 2;
      if (mid >= keepFrom && mid < keepTo) out.push(w.text);
    }
    if (to >= audio.length) break;
  }
  return { text: out.join(' '), ms: Math.round(ms) };
}
