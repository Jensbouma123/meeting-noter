import { stopTracks } from './capture-readout';
import type { SourceAcquirer } from './source-acquirer';

export async function reopenMicWithoutEchoCancellation(
  acquirer: SourceAcquirer,
  micStillRecorded: () => boolean,
): Promise<MediaStream | null> {
  const run = acquirer.run;
  let stream: MediaStream;
  try {
    stream = await acquirer.keep(run, acquirer.micStream(acquirer.micDeviceId, false));
  } catch (err) {
    if (!acquirer.isStale(run)) console.warn('[capture] Could not reopen the mic without echo cancellation', err);
    return null;
  }
  if (micStillRecorded()) return stream;
  acquirer.forgetStream(stream);
  stopTracks(stream);
  return null;
}
