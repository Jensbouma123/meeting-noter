import { DEFAULT_SPEECH_GATE_CONFIG } from './speech-gate-defaults';
import type { NoiseTextConfig } from './types';

const FILLERS = new Set([
  'ah', 'ahm', 'eh', 'ehm', 'er', 'erm', 'hm', 'hmm', 'mhm', 'mm', 'mm-hmm', 'uh', 'uhm', 'um', 'umm',
]);

const COMMON_REPLIES = new Set([
  'yeah', 'yes', 'yep', 'yup', 'no', 'nope', 'okay', 'ok', 'right', 'sure', 'exactly', 'cool', 'alright', 'thanks',
  'ja', 'nee', 'oké', 'precies', 'klopt', 'prima',
]);

function stripToWord(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '').replace(/^[-']+|[-']+$/g, '');
}

export function isFiller(text: string): boolean {
  const w = stripToWord(text);
  return FILLERS.has(w) || /^(h?m+(h?m+)*|u+h+m*|e+h+m*)$/.test(w);
}

export function isNoiseText(
  words: readonly { text: string; confidence?: number }[],
  cfg: NoiseTextConfig = DEFAULT_SPEECH_GATE_CONFIG,
): boolean {
  const bares = words.map((w) => stripToWord(w.text)).filter(Boolean);
  const chars = bares.join('').replace(/[^\p{L}\p{N}]/gu, '').length;
  if (chars < 2) return true;
  if (bares.every((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length <= 1 || isFiller(w))) return true;
  const confs = words.map((w) => w.confidence).filter((c): c is number => typeof c === 'number');
  if (confs.length === words.length && confs.length > 0) {
    const mean = confs.reduce((a, b) => a + b, 0) / confs.length;
    const lone = bares.length === 1 && !COMMON_REPLIES.has(bares[0]);
    if (mean < (lone ? cfg.minLoneWordConfidence : cfg.minWordConfidence)) return true;
  }
  return false;
}
