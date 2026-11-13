import type { CaptureMode } from './types/basics';

export async function requestMicStream(
  mode: CaptureMode | null,
  micDeviceId: string | undefined,
  echoCancellation: boolean,
): Promise<MediaStream> {
  const audio: MediaTrackConstraints = { echoCancellation, noiseSuppression: true };
  if (mode === 'both') audio.autoGainControl = false;
  if (micDeviceId) audio.deviceId = { ideal: micDeviceId };
  return navigator.mediaDevices.getUserMedia({ audio, video: false });
}
