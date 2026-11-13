import type { CaptureMode, LowConfSpan, SegmentOverlap, Source, Speaker } from '../meeting/types';
import type { ActionItem, Decision, Notes } from '../meeting/types/notes';
import type { StoredMeeting, StoredSegment } from './types';

const SOURCES: readonly Source[] = ['mic', 'system'];
const CAPTURE_MODES: readonly CaptureMode[] = ['mic', 'system', 'both'];
const MAX_SEGMENTS = 50_000;
const MAX_TEXT = 20_000;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

export function isMeetingId(v: unknown): v is string {
  return isStr(v) && /^[A-Za-z0-9_-]{1,100}$/.test(v);
}

function parseOverlap(v: unknown): SegmentOverlap | undefined {
  if (!isObj(v) || !isNum(v.start) || !isNum(v.end) || !Array.isArray(v.speakers)) return undefined;
  return { start: v.start, end: v.end, speakers: v.speakers.filter(isStr) };
}

function parseLowConfSpans(v: unknown): LowConfSpan[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const spans = v
    .filter((s): s is [number, number, number] => Array.isArray(s) && s.length === 3 && s.every(isNum) && s[0] >= 0 && s[1] > s[0])
    .slice(0, 200)
    .map(([a, b, c]): LowConfSpan => [a, b, c]);
  return spans.length > 0 ? spans : undefined;
}

function parseSegment(v: unknown): StoredSegment | null {
  if (!isObj(v)) return null;
  if (!isStr(v.id) || !isStr(v.speaker) || !isStr(v.text) || !isNum(v.start) || !isNum(v.end)) return null;
  if (!SOURCES.includes(v.source as Source)) return null;
  if (v.final === false) return null;
  const seg: StoredSegment = {
    id: v.id,
    source: v.source as Source,
    speaker: v.speaker,
    text: v.text.slice(0, MAX_TEXT),
    start: v.start,
    end: v.end,
  };
  const overlap = parseOverlap(v.overlap);
  if (overlap) seg.overlap = overlap;
  const lowConfSpans = parseLowConfSpans(v.lowConfSpans);
  if (lowConfSpans) seg.lowConfSpans = lowConfSpans;
  return seg;
}

function parseSpeakers(v: unknown): Record<string, Speaker> {
  const out: Record<string, Speaker> = {};
  if (!isObj(v)) return out;
  for (const [key, sp] of Object.entries(v)) {
    if (!isObj(sp) || !isStr(sp.label) || !SOURCES.includes(sp.source as Source)) continue;
    out[key] = {
      id: isStr(sp.id) ? sp.id : key,
      source: sp.source as Source,
      label: sp.label.slice(0, 200),
      colorIndex: isNum(sp.colorIndex) ? sp.colorIndex : 0,
    };
  }
  return out;
}

function parseNotes(v: unknown): Notes {
  if (!isObj(v)) return { actions: [], decisions: [] };
  const actions = (Array.isArray(v.actions) ? v.actions : []).filter(
    (a): a is ActionItem => isObj(a) && isStr(a.id) && isStr(a.text) && typeof a.done === 'boolean',
  );
  const decisions = (Array.isArray(v.decisions) ? v.decisions : []).filter(
    (d): d is Decision => isObj(d) && isStr(d.id) && isStr(d.text),
  );
  return { actions, decisions };
}

const MAX_PARTICIPANT = 40;
const MAX_PARTICIPANTS = 200;

function parseParticipants(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of v.slice(0, MAX_PARTICIPANTS)) {
    if (!isStr(name)) continue;
    const clean = name.trim().replace(/\s+/g, ' ').slice(0, MAX_PARTICIPANT);
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out;
}

export function parseStoredMeeting(v: unknown): StoredMeeting | null {
  if (!isObj(v) || !isMeetingId(v.id)) return null;
  if (!isNum(v.createdAt) || !isNum(v.updatedAt)) return null;
  const segments = (Array.isArray(v.segments) ? v.segments.slice(0, MAX_SEGMENTS) : [])
    .map(parseSegment)
    .filter((s): s is StoredSegment => s !== null);
  return {
    id: v.id,
    title: isStr(v.title) && v.title.trim() ? v.title.slice(0, 500) : 'Untitled meeting',
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
    startedAt: isNum(v.startedAt) ? v.startedAt : null,
    durationSeconds: isNum(v.durationSeconds) ? Math.round(v.durationSeconds) : null,
    captureMode: CAPTURE_MODES.includes(v.captureMode as CaptureMode) ? (v.captureMode as CaptureMode) : null,
    isDraft: v.isDraft === true && segments.length === 0,
    segments,
    speakers: parseSpeakers(v.speakers),
    notes: parseNotes(v.notes),
    participants: parseParticipants(v.participants),
    ...(v.folderId === null || isMeetingId(v.folderId) ? { folderId: v.folderId } : {}),
  };
}
