import { asrState } from './state';
import { notifyBrowserListeners } from './listeners';
import { resetModelFlags } from './state-updates';
import { clearInitProgress } from './progress-update';
import { clearLiveAudio } from './live-state';

export function resetBrowserASR(): void {
  if (asrState.engine) {
    asrState.engine.stop().catch((err) => {
      console.error('[asr] Failed to reset the speech model between sessions', err);
    });
  }
  resetModelFlags();
  asrState.blockedReason = null;
  asrState.transcribeInFlight = false;
  clearLiveAudio();
  clearInitProgress();
  notifyBrowserListeners();
}
