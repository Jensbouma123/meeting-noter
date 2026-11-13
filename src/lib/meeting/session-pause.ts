import { session } from './session-state';
import { getState, setState } from './store';

export function pauseMeeting(): void {
  if (getState().status !== 'live' || session.sessionOver) return;
  session.paused = true;
  session.capture?.suspend()?.catch((err) => {
    console.warn('Failed to suspend audio capture', err);
    setState({ warning: err instanceof Error ? err.message : 'Failed to suspend audio capture' });
  });
  setState({ status: 'paused' });
}

export function resumeMeeting(): void {
  if (getState().status !== 'paused' || session.sessionOver) return;
  session.paused = false;
  session.capture?.resume()?.catch((err) => {
    console.warn('Failed to resume audio capture', err);
    setState({ warning: err instanceof Error ? err.message : 'Failed to resume audio capture' });
  });
  setState({ status: 'live' });
}
