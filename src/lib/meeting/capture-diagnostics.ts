import { helperReadout, trackReadout } from './capture-readout';
import type { SourceNodes, SourceReadout } from './types/capture';
import type { Source } from './types/basics';

export function readSources(sources: Map<Source, SourceNodes>): Partial<Record<Source, SourceReadout>> {
  const readout: Partial<Record<Source, SourceReadout>> = {};
  for (const [source, entry] of sources) {
    const { stats } = entry;
    readout[source] = {
      tracks: entry.kind === 'helper' ? [helperReadout(entry.helper, source)] : entry.stream.getAudioTracks().map(trackReadout),
      frames: stats.frames,
      zeroFrames: stats.zeroFrames,
      soundFrames: stats.soundFrames,
      rms: stats.rms,
      peakRms: stats.peakRms,
    };
  }
  return readout;
}
