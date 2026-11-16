export function lengthBatches(lengths: readonly number[], size: number): number[][] {
  const groups = new Map<number, number[]>();
  lengths.forEach((length, index) => {
    const group = groups.get(length);
    if (group) group.push(index);
    else groups.set(length, [index]);
  });
  const step = Math.max(1, Math.floor(size));
  const batches: number[][] = [];
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += step) batches.push(group.slice(i, i + step));
  }
  return batches;
}
