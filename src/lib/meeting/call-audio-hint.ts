import type { CaptureDiagnostics } from './types/capture';

export function callAudioHint(diag: CaptureDiagnostics | null): string {
  const lost =
    "Call audio isn't being recorded, so other participants won't be transcribed (headphones don't leak into the mic).";
  if (diag?.callAudioUnsupported) {
    return (
      "Safari does not share call audio with web pages, so other participants won't be transcribed here. " +
      'Start the Meeting Noter audio helper (npm run helper) and restart the recording, ' +
      'or use Chrome or Edge and share the meeting tab with “Also share tab audio” (or the entire screen with system audio).'
    );
  }
  if (diag?.systemVia === 'helper' && diag.shareSilent) {
    return (
      `${lost} The Meeting Noter audio helper hears nothing: nothing is playing, or it lacks the permission. ` +
      'Allow it under System Settings → Privacy & Security → Screen & System Audio Recording ' +
      '(System Audio Recording), then restart the helper.'
    );
  }
  if (diag?.shareSilent) {
    if (diag.displaySurface === 'browser') {
      return `${lost} The shared tab plays no sound yet: share the tab the meeting runs in, with “Also share tab audio” on.`;
    }
    return (
      `${lost} The shared ${diag.displaySurface === 'window' ? 'window' : 'screen'} delivers no sound. ` +
      'On macOS, allow Chrome under System Settings → Privacy & Security → Screen & System Audio Recording ' +
      '(System Audio Recording), then restart the recording — or share the meeting tab with “Also share tab audio”.'
    );
  }
  return (
    `${lost} Restart and share the meeting tab with “Also share tab audio”, or for a desktop app ` +
    '(Teams/Zoom) its window or the entire screen with “Also share system audio”.'
  );
}
