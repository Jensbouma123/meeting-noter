import type { HelperSource } from './helper-source';
import type { CaptureMode } from './types/basics';
import type { SystemInput } from './types/capture';

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export function settleSources(
  mode: CaptureMode,
  micR: PromiseSettledResult<MediaStream | HelperSource | null>,
  sysR: PromiseSettledResult<SystemInput | null>,
  onShareError: (message: string) => void,
): { mic: MediaStream | HelperSource | null; system: SystemInput | null } {
  if (micR.status === 'rejected') throw micR.reason;
  const mic = micR.value;
  if (sysR.status === 'fulfilled') return { mic, system: sysR.value };
  if (mode === 'both') onShareError(errorMessage(sysR.reason));
  if (mode === 'both' && mic) return { mic, system: null };
  throw sysR.reason;
}
