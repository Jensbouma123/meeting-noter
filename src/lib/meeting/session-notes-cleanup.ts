import { notesKey } from './notes-storage';
import { removeParticipants } from './participants';

function removeLocalNotes(sessionId: string): void {
  try {
    localStorage.removeItem(notesKey(sessionId));
  } catch {
    return;
  }
}

export function removeNotesAndParticipants(sessionId: string): void {
  removeLocalNotes(sessionId);
  removeParticipants(sessionId);
}
