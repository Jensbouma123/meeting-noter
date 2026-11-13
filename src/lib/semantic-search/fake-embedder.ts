import { EMBEDDING_DIM, type Embedder } from './types';
import { tokenize } from './text';

function hash(s: string, seed: number): number {
  let h = (0x811c9dc5 ^ seed) >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function features(text: string): Array<[string, number]> {
  const out: Array<[string, number]> = [];
  for (const token of tokenize(text)) {
    out.push([token, 1]);
    const padded = `#${token}#`;
    for (let i = 0; i + 3 <= padded.length; i++) {
      out.push([padded.slice(i, i + 3), 0.5]);
    }
  }
  return out;
}

export function createFakeEmbedder(dim: number = EMBEDDING_DIM): Embedder {
  const embedOne = (text: string): Float32Array => {
    const v = new Float32Array(dim);
    for (const [feature, weight] of features(text)) {
      const idx = hash(feature, 0) % dim;
      const sign = hash(feature, 1) & 1 ? 1 : -1;
      v[idx] += sign * weight;
    }
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < dim; i++) v[i] /= norm;
    return v;
  };
  return {
    dim,
    async embed(texts) {
      return texts.map(embedOne);
    },
  };
}
