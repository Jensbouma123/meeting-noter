const SR = 16_000;

export function compress(x: Float32Array, thresholdDb: number, ratio: number): Float32Array {
  const attack = Math.exp(-1 / (0.005 * SR));
  const release = Math.exp(-1 / (0.08 * SR));
  const out = new Float32Array(x.length);
  let env = 0;
  for (let i = 0; i < x.length; i += 1) {
    const a = Math.abs(x[i]);
    env = a > env ? attack * env + (1 - attack) * a : release * env + (1 - release) * a;
    const db = 20 * Math.log10(Math.max(env, 1e-6));
    const reduction = db > thresholdDb ? (db - thresholdDb) * (1 - 1 / ratio) : 0;
    out[i] = x[i] * 10 ** (-reduction / 20);
  }
  return out;
}

export function clip(x: Float32Array, drive: number): Float32Array {
  let peak = 1e-6;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const norm = Math.tanh(drive);
  return x.map((v) => Math.tanh((drive * v) / peak) / norm);
}
