export function argmax(values: Float32Array): number {
  let best = 0;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max) {
      max = values[i];
      best = i;
    }
  }
  return best;
}
