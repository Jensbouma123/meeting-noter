import { setCallAudioMissing } from './call-audio-missing';
import { stopDiarizationForSource } from './diarization-bridge';
import { stopLangIdForSource } from './langid-bridge';
import { stopMeeting } from './session-stop';
import { session } from './session-state';
import { setState } from './store';
import type { Source } from './types';

export async function degradeAfterSourceEnded(source: Source): Promise<void> {
  const { capture } = session;
  if (!capture || session.sessionOver) return;
  capture.dropSource(source);
  stopDiarizationForSource(source);
  stopLangIdForSource(source);
  if (capture.activeSources.length > 0) {
    if (source === 'system') {
      setCallAudioMissing(true);
      setState({ warning: 'System audio share ended — continuing with microphone' });
    } else {
      setState({ warning: 'Microphone track ended — continuing with system audio' });
    }
    return;
  }
  await stopMeeting();
  setState({
    error: source === 'system'
      ? 'System audio share ended — session stopped'
      : 'Microphone track ended — session stopped',
  });
}
