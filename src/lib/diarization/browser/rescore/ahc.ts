import { EMBEDDING_SIZE, RESCORE_PARAMS } from './params';
import { LinkageRows } from './linkage-rows';

function dot(e: Float32Array, i: number, j: number, d: number): number {
  let s = 0;
  for (let c = 0; c < d; c += 1) s += e[i * d + c] * e[j * d + c];
  return s;
}

function initialRows(embs: Float32Array, n: number, d: number, alive: Uint8Array): LinkageRows {
  const rows = new LinkageRows(n, alive);
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) rows.set(i, j, dot(embs, i, j, d));
  for (let i = 0; i < n; i += 1) rows.rescanRow(i);
  return rows;
}

function mergeRows(rows: LinkageRows, n: number, alive: Uint8Array, size: Float64Array, bi: number, bj: number): void {
  const [si, sj] = [size[bi], size[bj]];
  for (let c = 0; c < n; c += 1) {
    if (c === bi || c === bj || !alive[c]) continue;
    rows.set(bi, c, (si * rows.get(bi, c) + sj * rows.get(bj, c)) / (si + sj));
  }
  size[bi] += sj;
  alive[bj] = 0;
  rows.rescanRow(bi);
  for (let c = 0; c < bj; c += 1) {
    if (!alive[c] || c === bi) continue;
    const stale = rows.bestAt[c] === bj || (c < bi && rows.bestAt[c] === bi);
    if (stale) rows.rescanRow(c);
    else if (c < bi) rows.offer(c, bi, rows.get(c, bi));
  }
}

export function averageLinkage(
  embs: Float32Array,
  n: number,
  tau: number,
  cap: number,
  d = EMBEDDING_SIZE,
): Int32Array {
  const alive = new Uint8Array(n).fill(1);
  const size = new Float64Array(n).fill(1);
  const label = Int32Array.from({ length: n }, (_, i) => i);
  const rows = initialRows(embs, n, d, alive);
  for (let count = n; count > 1; count -= 1) {
    const bi = rows.bestRow();
    if (bi < 0) break;
    const bj = rows.bestAt[bi];
    if (rows.best[bi] <= tau && count <= cap) break;
    mergeRows(rows, n, alive, size, bi, bj);
    for (let c = 0; c < n; c += 1) if (label[c] === bj) label[c] = bi;
  }
  return label;
}

function centroid(embs: Float32Array, lab: Int32Array, c: number, d: number): Float64Array {
  const v = new Float64Array(d);
  lab.forEach((l, i) => {
    if (l === c) for (let k = 0; k < d; k += 1) v[k] += embs[i * d + k];
  });
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

function nearestCentre(embs: Float32Array, i: number, centres: Float64Array[], d: number): number {
  let bestK = 0;
  let bestS = -Infinity;
  centres.forEach((v, k) => {
    let s = 0;
    for (let c = 0; c < d; c += 1) s += embs[i * d + c] * v[c];
    if (s > bestS) [bestS, bestK] = [s, k];
  });
  return bestK;
}

export function clusterEmbeddings(embs: Float32Array, n: number, p = RESCORE_PARAMS, d = EMBEDDING_SIZE): Int32Array {
  if (n <= 1) return new Int32Array(n);
  const lab = averageLinkage(embs, n, p.tau, p.maxClusters, d);
  const counts = new Map<number, number>();
  for (const l of lab) counts.set(l, (counts.get(l) ?? 0) + 1);
  const big = [...counts.keys()].filter((c) => counts.get(c)! >= p.minWindows).sort((a, b) => a - b);
  if (big.length > 0 && big.length < counts.size) {
    const centres = big.map((c) => centroid(embs, lab, c, d));
    for (let i = 0; i < n; i += 1) {
      if (counts.get(lab[i])! < p.minWindows) lab[i] = big[nearestCentre(embs, i, centres, d)];
    }
  }
  const ids = [...new Set(lab)].sort((a, b) => a - b);
  const remap = new Map(ids.map((id, i) => [id, i]));
  return lab.map((l) => remap.get(l)!);
}
