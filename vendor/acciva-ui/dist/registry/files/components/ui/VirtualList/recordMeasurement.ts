import { MEASUREMENT_EPSILON } from "@/components/ui/VirtualList/constants";

// Stores `measured` under `key`. Returns false (and leaves the map alone) when the
// cached height is already within epsilon, so callers can skip the state update.
export function recordMeasurement(map: Map<string | number, number>, key: string | number, measured: number): boolean {
  const previous = map.get(key);
  if (previous !== undefined && Math.abs(previous - measured) < MEASUREMENT_EPSILON) return false;
  map.set(key, measured);
  return true;
}
