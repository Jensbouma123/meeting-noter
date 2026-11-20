export function siSdr(est: Float32Array, ref: Float32Array): number {
  let dot = 0;
  let rr = 1e-12;
  for (let i = 0; i < ref.length; i += 1) {
    dot += est[i] * ref[i];
    rr += ref[i] * ref[i];
  }
  const a = dot / rr;
  let sig = 0;
  let err = 1e-12;
  for (let i = 0; i < ref.length; i += 1) {
    const t = a * ref[i];
    sig += t * t;
    err += (est[i] - t) ** 2;
  }
  return 10 * Math.log10(sig / err + 1e-12);
}

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function lcs(ref: string[], hyp: string[]): number {
  const row = new Array<number>(hyp.length + 1).fill(0);
  for (const r of ref) {
    let diag = 0;
    for (let j = 1; j <= hyp.length; j += 1) {
      const up = row[j];
      row[j] = r === hyp[j - 1] ? diag + 1 : Math.max(row[j], row[j - 1]);
      diag = up;
    }
  }
  return row[hyp.length];
}

export function editDistance(ref: string[], hyp: string[]): number {
  let prev = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= hyp.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[hyp.length];
}
