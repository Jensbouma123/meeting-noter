import type { Segment } from './types';
import { queueMeetingSync } from './server-sync';

export interface ActionItem {
  id: string;
  text: string;
  ownerSpeakerId?: string;
  ownerName?: string;
  due?: string;
  done: boolean;
  sourceSegmentId?: string;
}

export interface Decision {
  id: string;
  text: string;
  sourceSegmentId?: string;
}

export interface Notes {
  actions: ActionItem[];
  decisions: Decision[];
}

export type ActionItemInput = Partial<Omit<ActionItem, 'id' | 'done' | 'text'>> & { done?: boolean };
export type DecisionInput = Omit<Decision, 'id'>;
export type ActionItemPatch = Partial<Omit<ActionItem, 'id'>>;
export type NotePatch = ActionItemPatch;

export interface NoteSuggestion {
  text: string;
  sourceSegmentId: string;
  kind: 'action' | 'decision';
}

const EMPTY_NOTES: Notes = { actions: [], decisions: [] };
const listeners = new Map<string, Set<() => void>>();
/** Fragments shorter than this are noise, not suggestions. */
const MIN_SUGGESTION_WORDS = 5;
const ACTION_CUES = [
  'actiepunt', 'ik pak', 'wie doet', 'graag', 'deadline', 'action item', "i'll",
];
const DECISION_CUES = ['we besluiten', 'afgesproken', 'decided', 'agreed'];

export function notesKey(sessionId: string): string {
  return `mn.notes.v1.${sessionId}`;
}

function readNotes(sessionId: string): Notes {
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

function writeNotes(sessionId: string, notes: Notes): void {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    window.localStorage.setItem(notesKey(sessionId), JSON.stringify(notes));
  } catch {
    // Notes are best-effort when storage is unavailable or full.
  }
  queueMeetingSync(sessionId);
  notify(sessionId);
}

function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Use the fallback in restricted browser contexts.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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

export function suggestFromSegments(segments: readonly Segment[], lang?: string): NoteSuggestion[] {
  const language = lang?.toLowerCase().split(/[-_]/)[0];
  if (language && language !== 'nl' && language !== 'en') return [];
  const suggestions: NoteSuggestion[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    const text = segment.text.trim();
    if (text.split(/\s+/).length < MIN_SUGGESTION_WORDS) continue;
    const normalized = text.toLocaleLowerCase();
    const kind = DECISION_CUES.some((cue) => normalized.includes(cue))
      ? 'decision'
      : ACTION_CUES.some((cue) => normalized.includes(cue)) ? 'action' : null;
    if (kind && !seen.has(normalized)) {
      seen.add(normalized);
      suggestions.push({ text, sourceSegmentId: segment.id, kind });
    }
  }
  return suggestions;
}
