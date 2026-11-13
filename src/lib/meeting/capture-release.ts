import { stopDiarization } from './diarization-bridge';
import { stopLangId } from './langid-bridge';
import { session } from './session-state';
import { resetLevels } from './store';

export function releaseCapture(): Promise<void> {
  const c = session.capture;
  session.capture = null;
  resetLevels();
  return c ? c.dispose() : Promise.resolve();
}

export async function teardownCapture(): Promise<void> {
  const released = releaseCapture();
  stopDiarization();
  stopLangId();
  await released;
}
