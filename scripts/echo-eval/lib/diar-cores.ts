import type { DiarizerCore } from '@/lib/diarization/browser/core';
import type { DiarizerCoreQueue } from '../types/diar-host';

export const diarCores = new Set<DiarizerCore>();

export async function diarIdle(): Promise<void> {
  await Promise.all([...diarCores].map((c) => (c as unknown as DiarizerCoreQueue).running));
}

export const trackingCreateCore =
  <A extends unknown[]>(orig: (...args: A) => DiarizerCore) =>
  (...args: A): DiarizerCore => {
    const core = orig(...args);
    diarCores.add(core);
    return core;
  };
