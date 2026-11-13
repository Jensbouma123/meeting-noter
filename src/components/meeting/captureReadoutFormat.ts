import type { TrackReadout } from '@/lib/meeting/types/capture';

export function formatDbfs(rms: number): string {
  return rms > 0 ? `${(20 * Math.log10(rms)).toFixed(0)} dB` : '-∞ (zero)';
}

export function formatTrackLine(track: TrackReadout): string {
  const flags = [
    track.readyState,
    track.muted ? 'MUTED' : null,
    track.enabled ? null : 'disabled',
    `ec=${String(track.echoCancellation ?? '?')}`,
    `agc=${String(track.autoGainControl ?? '?')}`,
    `ns=${String(track.noiseSuppression ?? '?')}`,
    track.sampleRate ? `${track.sampleRate} Hz` : null,
    track.channelCount ? `${track.channelCount} ch` : null,
  ].filter(Boolean);
  return `${track.label || '(no label)'} · ${flags.join(' · ')}`;
}
