import { seedSpeakerStates, takeReportedSpeakerStates } from '@/lib/diarization/browser/speaker-handoff';
import { loadSpeakerState, saveSpeakerState } from './speaker-state-storage';
import { session } from './session-state';
import { getTranscriptSessionId } from './transcript-session';
import { isAppendActive } from './append-mode';

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
