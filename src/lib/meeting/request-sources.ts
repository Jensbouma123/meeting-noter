import { isSafariEngine } from '@/lib/asr/browser/is-safari-engine';
import { connectHelper, helperKnownReachable, probeHelper } from './helper-connection';
import type { HelperSource } from './helper-source';
import { SAFARI_MIC_NEEDS_HELPER } from './capture-constants';
import { helperMicUsable, safariMicWarning } from './safari-mic-warning';
import type { SourceAcquirer } from './source-acquirer';
import type { CaptureMode } from './types/basics';
import type { SourceRequests } from './types/source-requests';
import type { SystemInput } from './types/capture';

function prefixed(what: string) {
  return (err: unknown): never => {
    const msg = err instanceof Error ? err.message || err.name : String(err);
    throw new Error(`${what}: ${msg}`);
  };
}

function requestHelperCallAudio(acquirer: SourceAcquirer, run: number, mode: CaptureMode, safari: boolean) {
  return acquirer.keepHelper(run, connectHelper({ mic: safari && mode === 'both' })).catch((err: unknown) => {
    if (!safari || acquirer.isStale(run)) return prefixed('Call audio')(err);
    acquirer.callAudioUnsupported = mode === 'both';
    const why = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Safari does not share call audio with web pages, and the system audio helper did not answer (${why}). Meeting Noter did not open your microphone to avoid interrupting another call; start the helper (npm run helper) to record the call audio and your microphone through it.`,
    );
  });
}

function requestSafariMic(acquirer: SourceAcquirer, run: number): Promise<HelperSource> {
  return acquirer.keepHelper(run, connectHelper({ mic: true, system: false })).then(
    (helper) => {
      if (helperMicUsable(helper.mic)) return helper;
      throw new Error(safariMicWarning(helper.mic, true));
    },
    (err: unknown) => {
      if (acquirer.isStale(run) || helperKnownReachable()) return prefixed('Microphone')(err);
      throw new Error(SAFARI_MIC_NEEDS_HELPER);
    },
  );
}

function requestMicAfterShare(
  acquirer: SourceAcquirer,
  run: number,
  micDeviceId: string | undefined,
  systemP: Promise<SystemInput> | null,
): Promise<MediaStream> {
  const requestMic = (callAttached: boolean): Promise<MediaStream> => {
    acquirer.micCancelsEcho = callAttached && !isSafariEngine();
    return acquirer.keep(run, acquirer.micStream(micDeviceId, acquirer.micCancelsEcho));
  };
  if (!systemP) return requestMic(false);
  return systemP
    .then(
      () => true,
      () => false,
    )
    .then((attached) => {
      if (acquirer.isStale(run)) throw new Error('capture stopped');
      return requestMic(attached);
    });
}

export function requestSources(
  acquirer: SourceAcquirer,
  run: number,
  mode: CaptureMode,
  micDeviceId: string | undefined,
): SourceRequests {
  const wantMic = mode === 'mic' || mode === 'both';
  const wantSystem = mode === 'system' || mode === 'both';
  const safari = isSafariEngine();
  const viaHelper = wantSystem && (safari || helperKnownReachable());
  const systemP: Promise<SystemInput> | null = !wantSystem
    ? null
    : viaHelper
      ? requestHelperCallAudio(acquirer, run, mode, safari)
      : acquirer.keep(run, acquirer.systemStream()).catch(prefixed('Call audio'));
  if (wantSystem && !viaHelper) void probeHelper();
  const micP: Promise<MediaStream | HelperSource> | null = !wantMic
    ? null
    : safari
      ? mode === 'mic' ? requestSafariMic(acquirer, run) : null
      : requestMicAfterShare(acquirer, run, micDeviceId, systemP).catch(prefixed('Microphone'));
  return { micP, systemP };
}
