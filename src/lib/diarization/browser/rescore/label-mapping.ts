function overlapCounts(newProbs: Float32Array, numLabels: number, oldProbs: Float32Array, numChannels: number): Int32Array {
  const frames = Math.min(Math.floor(newProbs.length / numLabels), Math.floor(oldProbs.length / numChannels));
  const counts = new Int32Array(numLabels * numChannels);
  for (let t = 0; t < frames; t += 1) {
    for (let l = 0; l < numLabels; l += 1) {
      if (newProbs[t * numLabels + l] <= 0.5) continue;
      for (let k = 0; k < numChannels; k += 1) if (oldProbs[t * numChannels + k] > 0.5) counts[l * numChannels + k] += 1;
    }
  }
  return counts;
}

export function mapLabelsToChannels(
  newProbs: Float32Array,
  numLabels: number,
  oldProbs: Float32Array,
  numChannels: number,
): Int32Array {
  const out = new Int32Array(numLabels).fill(-1);
  if (numLabels === 0) return out;
  const counts = numChannels > 0 ? overlapCounts(newProbs, numLabels, oldProbs, numChannels) : new Int32Array(0);
  const pairs: [number, number, number][] = [];
  counts.forEach((c, i) => {
    if (c > 0) pairs.push([c, Math.floor(i / numChannels), i % numChannels]);
  });
  pairs.sort((a, b) => b[0] - a[0] || a[1] - b[1] || a[2] - b[2]);
  const taken = new Set<number>();
  for (const [, l, k] of pairs) {
    if (out[l] >= 0 || taken.has(k)) continue;
    out[l] = k;
    taken.add(k);
  }
  let next = numChannels;
  for (let l = 0; l < numLabels; l += 1) if (out[l] < 0) out[l] = next++;
  return out;
}
