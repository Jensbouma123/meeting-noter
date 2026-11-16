// Average-linkage AHC on cosine similarity of L2-normalised embeddings
// (exchange/diar16 cluster.py without cannot-links, plus method_b.cluster).
import { EMBEDDING_SIZE, RESCORE_PARAMS } from './params';

function dot(e: Float32Array, i: number, j: number, d: number): number {
  let s = 0;
  for (let c = 0; c < d; c += 1) s += e[i * d + c] * e[j * d + c];
  return s;
}

/** Merge while the best average linkage > tau, then until at most `cap` clusters remain. */
export function averageLinkage(embs: Float32Array, n: number, tau: number, cap: number, d = EMBEDDING_SIZE): Int32Array {
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

/** Cluster windows; clusters under `minWindows` join their nearest big cluster. Labels are 0..m-1 by first id. */
export function clusterEmbeddings(embs: Float32Array, n: number, p = RESCORE_PARAMS, d = EMBEDDING_SIZE): Int32Array {
  if (n <= 1) return new Int32Array(n);
  const lab = averageLinkage(embs, n, p.tau, p.maxClusters, d);
  const counts = new Map<number, number>();
  for (const l of lab) counts.set(l, (counts.get(l) ?? 0) + 1);
  const big = [...counts.keys()].filter((c) => counts.get(c)! >= p.minWindows).sort((a, b) => a - b);
  if (big.length > 0 && big.length < counts.size) {
    const cent = big.map((c) => centroid(embs, lab, c, d));
    for (let i = 0; i < n; i += 1) {
      if (counts.get(lab[i])! >= p.minWindows) continue;
      let bestK = 0;
      let bestS = -Infinity;
      cent.forEach((v, k) => {
        let s = 0;
        for (let c = 0; c < d; c += 1) s += embs[i * d + c] * v[c];
        if (s > bestS) [bestS, bestK] = [s, k];
      });
      lab[i] = big[bestK];
    }
  }
  const ids = [...new Set(lab)].sort((a, b) => a - b);
  const remap = new Map(ids.map((id, i) => [id, i]));
  return lab.map((l) => remap.get(l)!);
}

function centroid(embs: Float32Array, lab: Int32Array, c: number, d: number): Float64Array {
  const v = new Float64Array(d);
  lab.forEach((l, i) => {
    if (l === c) for (let k = 0; k < d; k += 1) v[k] += embs[i * d + k];
  });
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}
