import { seedSpeakerStates, takeReportedSpeakerStates } from '@/lib/diarization/browser/speaker-state';
import { loadSpeakerState, saveSpeakerState } from './persist';
import { session } from './session-state';
import { getTranscriptSessionId, isAppendActive } from './store';

export function beginSpeakerSession(): void {
  const id = getTranscriptSessionId();
  const append = isAppendActive();
  session.speakerSession = { id, append };
  seedSpeakerStates(append && id ? loadSpeakerState(id) : null);
}

export function saveSpeakerSession(): void {
  const { id, append } = session.speakerSession;
  const reported = takeReportedSpeakerStates();
  if (!id) return;
  const kept = append ? loadSpeakerState(id) ?? {} : {};
  saveSpeakerState(id, { ...kept, ...reported });
}
