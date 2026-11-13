export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function normalizedCopy(v: Float32Array): Float32Array {
  const out = new Float32Array(v);
  let norm = 0;
  for (let i = 0; i < out.length; i++) norm += out[i] * out[i];
  norm = Math.sqrt(norm);
  if (norm > 0) for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  const na = Math.sqrt(dot(a, a));
  const nb = Math.sqrt(dot(b, b));
  return na > 0 && nb > 0 ? dot(a, b) / (na * nb) : 0;
}

export function poolVectors(vectors: Float32Array[], from: number, to: number): Float32Array {
  const out = new Float32Array(vectors[0].length);
  for (let i = from; i <= to; i++) {
    for (let j = 0; j < out.length; j++) out[j] += vectors[i][j];
  }
  return out;
}
