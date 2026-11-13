import { readNotes, writeNotes } from './notes-storage';
import type { ActionItem, ActionItemInput, Decision, NotePatch, Notes } from './types/notes';

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function getNotes(sessionId: string): Notes {
  return readNotes(sessionId);
}

export function addAction(sessionId: string, text: string, options: ActionItemInput = {}): ActionItem {
  const action: ActionItem = { ...options, id: newId(), text, done: options.done ?? false };
  const notes = readNotes(sessionId);
  writeNotes(sessionId, { ...notes, actions: [...notes.actions, action] });
  return action;
}

export function updateAction(sessionId: string, actionId: string, patch: NotePatch): void {
  const notes = readNotes(sessionId);
  const actions = notes.actions.map((item) => item.id === actionId ? { ...item, ...patch, id: item.id } : item);
  if (!notes.actions.some((item) => item.id === actionId)) return;
  writeNotes(sessionId, { ...notes, actions });
}

export function removeAction(sessionId: string, actionId: string): void {
  const notes = readNotes(sessionId);
  const actions = notes.actions.filter((item) => item.id !== actionId);
  if (actions.length === notes.actions.length) return;
  writeNotes(sessionId, { ...notes, actions });
}

export function addDecision(sessionId: string, text: string, sourceSegmentId?: string): Decision {
  const decision: Decision = { id: newId(), text, ...(sourceSegmentId ? { sourceSegmentId } : {}) };
  const notes = readNotes(sessionId);
  writeNotes(sessionId, { ...notes, decisions: [...notes.decisions, decision] });
  return decision;
}

export function removeDecision(sessionId: string, decisionId: string): void {
  const notes = readNotes(sessionId);
  const decisions = notes.decisions.filter((item) => item.id !== decisionId);
  if (decisions.length === notes.decisions.length) return;
  writeNotes(sessionId, { ...notes, decisions });
}

export function openCount(sessionId: string): number {
  return readNotes(sessionId).actions.filter((action) => !action.done).length;
}
