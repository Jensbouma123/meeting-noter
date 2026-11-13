import { lettersOf } from './text-chunk';

const SOUND_CODES: Record<string, string> = {
  b: '1', f: '1', p: '1', v: '1',
  c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
  d: '3', t: '3',
  l: '4',
  m: '5', n: '5',
  r: '6',
};

export function soundKey(text: string): string {
  const letters = lettersOf(text).normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!letters) return '';
  let key = letters[0];
  let last = SOUND_CODES[letters[0]] ?? '';
  for (const ch of letters.slice(1)) {
    const code = SOUND_CODES[ch];
    if (code === undefined) {
      if (ch !== 'h' && ch !== 'w') last = '';
      continue;
    }
    if (code !== last) key += code;
    last = code;
  }
  return key;
}
