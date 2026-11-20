import fs from 'node:fs';
import path from 'node:path';
import type { ExternalReference, ExternalTurn } from '../types/external-reference';
import type { MeetingCase } from '../types/meeting-case';
import { drawBleedParams } from './draw-bleed';
import { referenceTurns } from './external-turns';
import { hashString, makeRng } from './rng';

export const EXTERNAL_WAV = 'audio16k.wav';
export const EXTERNAL_REFERENCE = 'reference.json';

export function buildExternalCases(ref: ExternalReference, fallbackId: string): MeetingCase[] {
  const base = ref.id ?? fallbackId;
  const lang = ref.lang ?? 'en';
  const turns = referenceTurns(ref.turns, lang);
  const speakers = [...new Set(turns.map((t) => t.speaker))].sort().map((id) => ({ id, role: 'remote' as const, lang }));
  const durationSec = Math.max(0, ...turns.map((t) => t.endSec));
  const make = (variant: string, bleed: boolean): MeetingCase => {
    const id = `${base}-${variant}`;
    return { id, split: 'heldout', lang, speakers, bleed: bleed ? drawBleedParams(makeRng(hashString(id))) : null, turns, durationSec };
  };
  return [make('ext-system', false), make('ext-bleed', true)];
}

function parseReference(raw: unknown, file: string): ExternalReference {
  const ref = (Array.isArray(raw) ? { turns: raw } : raw) as ExternalReference;
  const ok = (t: ExternalTurn) => Number.isFinite(t?.start) && Number.isFinite(t?.end) && typeof t?.spk === 'string';
  if (!Array.isArray(ref?.turns) || !ref.turns.every(ok)) throw new Error(`${file}: expected turns of {start, end, spk, text?}`);
  return ref;
}

export function loadExternalCases(dir: string): MeetingCase[] {
  const file = path.join(dir, EXTERNAL_REFERENCE);
  if (!fs.existsSync(path.join(dir, EXTERNAL_WAV))) throw new Error(`${dir}: missing ${EXTERNAL_WAV}`);
  return buildExternalCases(parseReference(JSON.parse(fs.readFileSync(file, 'utf8')), file), path.basename(dir));
}
