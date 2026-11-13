import { isPostStopTranscriptionRunning } from './post-stop-progress';
import { session } from './session-state';
import { getState, setState } from './store-core';

const STILL_TRANSCRIBING_WARNING = 'Still transcribing the previous recording — wait for it to finish.';

export function startIsBlocked(): boolean {
  if (session.stopPromise) {
    setState({
      warning: isPostStopTranscriptionRunning()
        ? STILL_TRANSCRIBING_WARNING
        : 'Still finishing the previous recording — try again in a moment.',
    });
    return true;
  }
  const current = getState().status;
  const looksActive =
    current === 'requesting' || current === 'connecting' || current === 'live' || current === 'paused';
  if (looksActive) {
    if (!session.sessionOver && session.capture) return true;
    console.warn(
      `meeting.start(): status was "${current}" with no active session — resetting and starting anyway.`,
    );
  }
  if (isPostStopTranscriptionRunning()) {
    setState({ warning: STILL_TRANSCRIBING_WARNING });
    return true;
  }
  return false;
}
