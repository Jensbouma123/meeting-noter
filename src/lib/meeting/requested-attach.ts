import type { HelperSource } from './helper-source';
import { isStream } from './capture-readout';
import { safariMicWarning } from './safari-mic-warning';
import { attachHelperSource, attachStreamSource } from './source-attach';
import type { AttachHost } from './types/source-attach';
import type { AttachOutcome } from './types/attach-outcome';
import type { SystemInput } from './types/capture';

export function attachRequestedSources(
  host: AttachHost,
  ctx: AudioContext,
  mic: MediaStream | HelperSource | null,
  system: SystemInput | null,
): AttachOutcome {
  const outcome: AttachOutcome = { warning: null, systemVia: null };
  if (mic && isStream(mic)) {
    attachStreamSource(host, ctx, 'mic', mic);
  } else if (mic) {
    attachHelperSource(host, mic, 'mic');
    outcome.warning = safariMicWarning(mic.mic, true);
  }
  if (!system) return outcome;
  if (isStream(system)) {
    attachStreamSource(host, ctx, 'system', system);
    outcome.systemVia = 'share';
  } else {
    attachHelperSource(host, system, 'system');
    outcome.systemVia = 'helper';
    if (system.mic) outcome.warning = safariMicWarning(system.mic);
  }
  return outcome;
}
