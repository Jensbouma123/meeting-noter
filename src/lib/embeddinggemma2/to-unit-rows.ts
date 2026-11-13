import { EG2_DIM } from './constants';
import type { TensorLike } from './types';

export function toUnitRows(tensor: TensorLike, expectedRows: number): Float32Array[] {
  const [rows, dim] = [tensor.dims[0], tensor.dims[tensor.dims.length - 1]];
  if (dim !== EG2_DIM || rows !== expectedRows) {
    throw new Error(
      `EmbeddingGemma2: expected [${expectedRows}, ${EG2_DIM}] output, got [${tensor.dims.join(', ')}]`,
    );
  }
  const out: Float32Array[] = [];
  for (let i = 0; i < rows; i++) {
    const vector = new Float32Array(EG2_DIM);
    let sumSquares = 0;
    for (let j = 0; j < EG2_DIM; j++) {
      const value = Number(tensor.data[i * EG2_DIM + j]);
      vector[j] = value;
      sumSquares += value * value;
    }
    const norm = Math.sqrt(sumSquares) || 1;
    for (let j = 0; j < EG2_DIM; j++) vector[j] /= norm;
    out.push(vector);
  }
  return out;
}
