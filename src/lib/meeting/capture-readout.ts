import type { HelperSource } from './helper-source';
import { SHARE_SOUND_RMS } from './capture-constants';
import type { SourceStats, TrackReadout } from './types/capture';
import type { Source } from './types/basics';

export function helperReadout(helper: HelperSource, source: Source): TrackReadout {
  return {
    label: source === 'mic'
      ? `System audio helper (mic alone: ${helper.mic?.state ?? 'unavailable'})`
      : helper.mic ? `System audio helper (Core Audio tap + mic: ${helper.mic.state})` : 'System audio helper (Core Audio tap)',
    readyState: helper.live ? 'live' : 'ended',
    muted: helper.hello.permission === 'denied',
    enabled: true,
    sampleRate: helper.hello.sampleRate,
    channelCount: 1,
  };
}

export function trackReadout(track: MediaStreamTrack): TrackReadout {
  const settings = (track.getSettings?.() ?? {}) as MediaTrackSettings & { echoCancellation?: boolean | string };
  return {
    label: track.label ?? '',
    readyState: track.readyState ?? 'unknown',
    muted: track.muted ?? false,
    enabled: track.enabled ?? true,
    deviceId: settings.deviceId,
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
    noiseSuppression: settings.noiseSuppression,
  };
}

export function countFrame(stats: SourceStats, rms: number): void {
  stats.frames += 1;
  if (rms === 0) stats.zeroFrames += 1;
  if (rms >= SHARE_SOUND_RMS) stats.soundFrames += 1;
  stats.rms = rms;
  if (stats.peakWindow % 10 === 0) stats.peakRms = 0;
  stats.peakWindow += 1;
  stats.peakRms = Math.max(stats.peakRms, rms);
}

export function newStats(): SourceStats {
  return { frames: 0, zeroFrames: 0, soundFrames: 0, rms: 0, peakRms: 0, peakWindow: 0 };
}

export function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {}
  }
}

export function isStream(input: MediaStream | HelperSource): input is MediaStream {
  return typeof (input as MediaStream).getTracks === 'function';
}
