import { queueMeetingSync } from './server-sync';
import type { ActionItem, Decision, Notes } from './types/notes';

const EMPTY_NOTES: Notes = { actions: [], decisions: [] };
const listeners = new Map<string, Set<() => void>>();

export function notesKey(sessionId: string): string {
  return `mn.notes.v1.${sessionId}`;
}

export function readNotes(sessionId: string): Notes {
  if (typeof window === 'undefined' || !sessionId) return { ...EMPTY_NOTES };
  try {
    const raw = window.localStorage.getItem(notesKey(sessionId));
    if (!raw) return { ...EMPTY_NOTES };
    const parsed = JSON.parse(raw) as Partial<Notes>;
    if (!parsed || !Array.isArray(parsed.actions) || !Array.isArray(parsed.decisions)) return { ...EMPTY_NOTES };
    return {
      actions: parsed.actions.filter((item): item is ActionItem =>
        !!item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.done === 'boolean'),
      decisions: parsed.decisions.filter((item): item is Decision =>
        !!item && typeof item.id === 'string' && typeof item.text === 'string'),
    };
  } catch {
    return { ...EMPTY_NOTES };
  }
}

function notify(sessionId: string): void {
  listeners.get(sessionId)?.forEach((listener) => listener());
}

function storeNotesLocally(sessionId: string, notes: Notes): void {
  try {
    window.localStorage.setItem(notesKey(sessionId), JSON.stringify(notes));
  } catch {
    return;
  }
}

export function writeNotes(sessionId: string, notes: Notes): void {
  if (typeof window === 'undefined' || !sessionId) return;
  storeNotesLocally(sessionId, notes);
  queueMeetingSync(sessionId);
  notify(sessionId);
}

export function adoptNotes(sessionId: string, notes: Notes): void {
  if (typeof window === 'undefined' || !sessionId) return;
  storeNotesLocally(sessionId, notes);
  notify(sessionId);
}

export function hasLocalNotes(sessionId: string): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(notesKey(sessionId)) !== null;
  } catch {
    return false;
  }
}

export function subscribe(sessionId: string, callback: () => void): () => void {
  let sessionListeners = listeners.get(sessionId);
  if (!sessionListeners) {
    sessionListeners = new Set();
    listeners.set(sessionId, sessionListeners);
  }
  sessionListeners.add(callback);
  return () => {
    sessionListeners?.delete(callback);
    if (sessionListeners?.size === 0) listeners.delete(sessionId);
  };
}
