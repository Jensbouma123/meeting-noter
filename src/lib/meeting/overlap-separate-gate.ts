import { MIN_RETRANSCRIBE_SECONDS } from './overlap-spans';
import type { Source } from './types';
import type { OverlapSpan } from './types/overlap-retranscribe';
import type { GateState, SeparationSkip, SeparatorBackend } from './types/overlap-separate';

export const SEPARATION_RATE_WINDOW_MS = 60_000;
export const SEPARATIONS_PER_WINDOW = 6;

export function separationGate(
  span: OverlapSpan,
  source: Source,
  backend: SeparatorBackend,
  state: GateState,
  now: number,
): SeparationSkip | null {
  if (source !== 'system') return 'source';
  if (span.end - span.start < MIN_RETRANSCRIBE_SECONDS) return 'short';
  if (span.speakers.length !== 2) return 'speakers';
  if (backend !== 'webgpu' && backend !== 'unloaded') return 'backend';
  if (state.running) return 'busy';
  const inWindow = state.recent.filter((t) => now - t < SEPARATION_RATE_WINDOW_MS).length;
  return inWindow >= SEPARATIONS_PER_WINDOW ? 'rate' : null;
}
