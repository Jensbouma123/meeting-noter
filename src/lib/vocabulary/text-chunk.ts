import type { Chunk } from './types';

const CHUNK = /^([^\p{L}\p{N}]*)([^]*?)([^\p{L}\p{N}]*)$/u;

export function splitChunk(text: string): Chunk {
  const m = CHUNK.exec(text);
  const chunk = m ? { lead: m[1], core: m[2], trail: m[3] } : { lead: '', core: text, trail: '' };
  const poss = /^(.+\p{L})([’'][sS])$/u.exec(chunk.core);
  return poss ? { lead: chunk.lead, core: poss[1], trail: poss[2] + chunk.trail } : chunk;
}

export function wordCores(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((w) => splitChunk(w).core.toLowerCase())
    .filter(Boolean);
}

export function lettersOf(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
