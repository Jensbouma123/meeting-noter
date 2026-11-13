import type { HelperMic } from './types/helper';

export function helperMicUsable(mic: HelperMic | null): boolean {
  return !!mic && (mic.state === 'live' || mic.state === 'unknown');
}

function unusableMicReason(mic: HelperMic | null): string {
  if (mic?.state === 'denied') {
    return 'the helper has no Microphone permission (System Settings → Privacy & Security → Microphone)';
  }
  if (mic?.state === 'silent') {
    return 'the helper’s microphone delivers only silence — macOS has not given the helper Microphone permission (System Settings → Privacy & Security → Microphone: allow Meeting Noter Audio Helper, then restart it), or the input is muted';
  }
  return `the helper could not open it${mic?.error ? ` (${mic.error})` : ''}`;
}

export function safariMicWarning(mic: HelperMic | null, alone = false): string {
  if (helperMicUsable(mic)) {
    return alone
      ? 'Safari can interrupt the microphone and camera in another call app, so Safari does not open your microphone: the system audio helper records it instead. Your other call keeps its microphone.'
      : 'Safari can interrupt the microphone and camera in another call app, so Safari does not open your microphone: the system audio helper records it instead, mixed with the call audio, so your words appear among the call’s speakers. Your other call keeps its microphone.';
  }
  const why = unusableMicReason(mic);
  return alone
    ? `Your microphone is not recorded: ${why}. Safari does not open it because it can interrupt the microphone and camera in another call app.`
    : `Your microphone is not recorded: ${why}. Safari does not open it because it can interrupt the microphone and camera in another call app, so this recording captures system audio only.`;
}
