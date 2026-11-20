import { createMossformer2Client } from '@/lib/separation/browser/client';
import type { SeparatorClient } from '@/lib/separation/browser/types/client';
import { setOverlapSeparator } from './overlap-retranscribe';

export const OVERLAP_SEPARATION_KEY = 'overlap-separation';

let client: SeparatorClient | null = null;

export function overlapSeparationEnabled(): boolean {
  try {
    return globalThis.localStorage?.getItem(OVERLAP_SEPARATION_KEY) === 'mossformer2';
  } catch {
    return false;
  }
}

export function overlapSeparatorClient(): SeparatorClient {
  client ??= createMossformer2Client();
  return client;
}

export function installOverlapSeparator(enabled = overlapSeparationEnabled()): SeparatorClient | null {
  const sep = enabled ? overlapSeparatorClient() : null;
  setOverlapSeparator(sep);
  return sep;
}
