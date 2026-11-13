import { stopTracks } from './capture-readout';

const SHARE_CONSTRAINTS = {
  video: { displaySurface: 'monitor' },
  audio: true,
  systemAudio: 'include',
  windowAudio: 'system',
  monitorTypeSurfaces: 'include',
  surfaceSwitching: 'include',
} as DisplayMediaStreamOptions;

function dropVideoTracks(stream: MediaStream): void {
  for (const track of stream.getVideoTracks()) {
    try {
      track.stop();
    } catch {}
    stream.removeTrack(track);
  }
}

async function disableVoiceProcessing(stream: MediaStream): Promise<void> {
  for (const track of stream.getAudioTracks()) {
    try {
      await track.applyConstraints?.({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
    } catch {}
  }
}

export async function requestSystemStream(onSurface: (surface: string | null) => void): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getDisplayMedia(SHARE_CONSTRAINTS);
  const surface = (stream.getVideoTracks()[0]?.getSettings?.() as { displaySurface?: string } | undefined)
    ?.displaySurface;
  onSurface(surface ?? null);
  dropVideoTracks(stream);
  if (stream.getAudioTracks().length === 0) {
    stopTracks(stream);
    throw new Error('No system audio track — share a tab with audio or the entire screen');
  }
  await disableVoiceProcessing(stream);
  return stream;
}
