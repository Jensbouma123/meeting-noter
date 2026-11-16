function dot(e: Float32Array, i: number, j: number, d: number): number {
  let s = 0;
  for (let c = 0; c < d; c += 1) s += e[i * d + c] * e[j * d + c];
  return s;
}

export function denseAverageLinkage(embs: Float32Array, n: number, tau: number, cap: number, d: number): Int32Array {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) L[i * n + j] = i === j ? -Infinity : dot(embs, i, j, d);
  const size = new Float64Array(n).fill(1);
  const alive = new Uint8Array(n).fill(1);
  const label = Int32Array.from({ length: n }, (_, i) => i);
  let count = n;
  while (count > 1) {
    let bi = -1;
    let bj = -1;
    let best = -Infinity;
    for (let i = 0; i < n; i += 1) {
      if (!alive[i]) continue;
      for (let j = 0; j < n; j += 1) {
        if (j !== i && alive[j] && L[i * n + j] > best) [best, bi, bj] = [L[i * n + j], i, j];
      }
    }
    if (best <= tau && count <= cap) break;
    const si = size[bi];
    const sj = size[bj];
    for (let c = 0; c < n; c += 1) L[bi * n + c] = (si * L[bi * n + c] + sj * L[bj * n + c]) / (si + sj);
    for (let c = 0; c < n; c += 1) L[c * n + bi] = L[bi * n + c];
    L[bi * n + bi] = -Infinity;
    size[bi] += sj;
    alive[bj] = 0;
    count -= 1;
    for (let c = 0; c < n; c += 1) if (label[c] === bj) label[c] = bi;
  }
  return label;
}
