import { moveMeeting } from '@/lib/folders/folders-api';
import { requestPersistentStorage } from './persistent-storage';
import { flushServerSync } from './sync-flush';
import { queueMeetingSync } from './sync-queue';
import { saveSessionTranscript } from './session-transcript-storage';
import {
  SESSION_INDEX_VERSION,
  generateSessionId,
  notifySessionsChanged,
  readSessionIndex,
  writeSessionIndex,
} from './session-index';
import type { CaptureMode, Segment } from './types';
import type { CreateSessionInput, SessionEntry, SessionMetadata } from './types/session-store';

let persistRequested = false;

export function listSessions(): SessionMetadata[] {
  return readSessionIndex().sessions.slice().sort((a, b) => b.createdAt - a.createdAt);
}

function transcriptDuration(segments: Segment[]): number {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const s of segments) {
    if (s.start < minStart) minStart = s.start;
    if (s.end > maxEnd) maxEnd = s.end;
  }
  return Math.round(maxEnd - minStart);
}

export function persistSession(input: CreateSessionInput): string {
  const index = readSessionIndex();
  const now = Date.now();

  const sessionId = input.sessionId ?? generateSessionId();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  const existing = existingIdx >= 0 ? index.sessions[existingIdx] : null;
  const finalTitle =
    typeof input.title === 'string' ? input.title : existing?.title ?? 'Untitled meeting';
  const segments = Array.isArray(input.segments)
    ? input.segments.filter((s) => s && s.final === true)
    : [];
  const startedAt = typeof input.startedAt === 'number' ? input.startedAt : null;

  let segmentCount = existing?.segmentCount ?? 0;
  let durationSeconds = existing?.durationSeconds ?? null;
  if (segments.length > 0) {
    segmentCount = segments.length;
    durationSeconds = transcriptDuration(segments);
  }

  const entry: SessionEntry = {
    version: SESSION_INDEX_VERSION,
    sessionId,
    title: finalTitle,
    segmentCount,
    durationSeconds,
    createdAt: existing?.createdAt ?? startedAt ?? now,
    updatedAt: now,
    isDraft: segmentCount > 0 ? false : existing?.isDraft ?? true,
    ...(existing?.captureMode ? { captureMode: existing.captureMode } : {}),
  };

  if (existing) {
    index.sessions[existingIdx] = entry;
  } else {
    index.sessions.push(entry);
  }

  writeSessionIndex(index);
  saveSessionTranscript({
    sessionId,
    title: finalTitle,
    segments,
    speakers: input.speakers ?? {},
    startedAt,
  });
  if (segmentCount > 0 && !persistRequested) {
    persistRequested = true;
    void requestPersistentStorage();
  }
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return sessionId;
}

export function createDraftSession(title: string): string {
  const index = readSessionIndex();
  const now = Date.now();
  const sessionId = generateSessionId();
  const finalTitle = typeof title === 'string' ? title : 'Untitled meeting';

  index.sessions.push({
    version: SESSION_INDEX_VERSION,
    sessionId,
    title: finalTitle,
    segmentCount: 0,
    durationSeconds: null,
    createdAt: now,
    updatedAt: now,
    isDraft: true,
  });
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return sessionId;
}

export async function createDraftSessionInFolder(title: string, folderId: string | null): Promise<string> {
  const sessionId = createDraftSession(title);
  if (folderId) {
    await flushServerSync();
    await moveMeeting(sessionId, folderId);
  }
  return sessionId;
}

function updateEntry(sessionId: string, change: (entry: SessionEntry) => SessionEntry): boolean {
  const index = readSessionIndex();
  const existingIdx = index.sessions.findIndex((s) => s.sessionId === sessionId);
  if (existingIdx < 0) return false;
  index.sessions[existingIdx] = change(index.sessions[existingIdx]);
  writeSessionIndex(index);
  queueMeetingSync(sessionId);
  notifySessionsChanged();
  return true;
}

export function unmarkDraft(sessionId: string): void {
  updateEntry(sessionId, (entry) => ({ ...entry, isDraft: false, updatedAt: Date.now() }));
}

export function setSessionCaptureMode(sessionId: string, captureMode: CaptureMode): void {
  updateEntry(sessionId, (entry) => ({ ...entry, captureMode }));
}

export function renameSession(sessionId: string, title: string): boolean {
  if (typeof title !== 'string') return false;
  return updateEntry(sessionId, (entry) => ({ ...entry, title, updatedAt: Date.now() }));
}
