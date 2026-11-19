import { percentile } from './envelope-math';

const EPS = 1e-12;
const MIN_BIN_FRAMES = 10;
const ACTIVE_BELOW_PEAK = 0.01;

function monotone(levels: number[]): number[] {
  const blocks: { sum: number; n: number }[] = [];
  const avg = (i: number) => blocks[i].sum / blocks[i].n;
  for (const v of levels) {
    blocks.push({ sum: v, n: 1 });
    while (blocks.length > 1 && avg(blocks.length - 2) > avg(blocks.length - 1)) {
      const top = blocks.pop()!;
      blocks[blocks.length - 1].sum += top.sum;
      blocks[blocks.length - 1].n += top.n;
    }
  }
  return blocks.flatMap((b) => Array<number>(b.n).fill(b.sum / b.n));
}

export function predictEcho(mic: Float64Array, sys: Float64Array, noise: number, pct: number, bins: number): Float64Array {
  let peak = 0;
  for (const v of sys) peak = Math.max(peak, v);
  const floor = ACTIVE_BELOW_PEAK * peak + EPS;
  const active = Array.from(sys.keys()).filter((t) => sys[t] > floor).sort((a, b) => sys[a] - sys[b]);
  const out = new Float64Array(sys.length);
  if (!active.length) return out;
  const k = Math.max(1, Math.min(bins, Math.floor(active.length / MIN_BIN_FRAMES)));
  const edges: number[] = [];
  const logMids: number[] = [];
  const logLevels: number[] = [];
  for (let i = 0; i < k; i += 1) {
    const frames = active.slice(Math.floor((i * active.length) / k), Math.floor(((i + 1) * active.length) / k));
    const mid = sys[frames[frames.length >> 1]];
    const gain = percentile(frames.map((t) => Math.max(0, mic[t] - noise) / sys[t]), pct);
    edges.push(sys[frames[frames.length - 1]]);
    logMids.push(Math.log(mid));
    logLevels.push(Math.log(Math.max(EPS, gain * mid)));
  }
  const gains = monotone(logLevels).map((l, i) => Math.exp(l - logMids[i]));
  for (let t = 0; t < sys.length; t += 1) {
    let b = 0;
    while (b < k - 1 && sys[t] > edges[b]) b += 1;
    out[t] = gains[b] * sys[t];
  }
  return out;
}
