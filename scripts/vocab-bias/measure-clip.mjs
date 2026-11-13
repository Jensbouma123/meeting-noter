import fs from 'node:fs';
import path from 'node:path';
import { wer } from '../asr-bench-safari.mjs';
import { countTerm } from './count-term.mjs';
import { readWav16kMono } from './read-wav.mjs';
import { SAMPLE_RATE, transcribeInOverlappingWindows } from './windowed-transcribe.mjs';

export async function measureClip({ wav, refFile, model, slot, app, words, prepared, strength }) {
  const audio = readWav16kMono(wav);
  slot.setWords([], strength);
  const plain = await transcribeInOverlappingWindows(model, audio);
  slot.setWords(words, strength);
  const boosted = await transcribeInOverlappingWindows(model, audio);
  slot.setWords([], strength);
  const plainAgain = await transcribeInOverlappingWindows(model, audio);
  const modes = {
    none: plain.text,
    boost: boosted.text,
    fixupOnly: app.applyVocabularyToText(plain.text, prepared),
    boostAndFixup: app.applyVocabularyToText(boosted.text, prepared),
  };
  const clip = {
    wav: path.basename(wav),
    seconds: +(audio.length / SAMPLE_RATE).toFixed(1),
    decodeMs: { none: plain.ms, boost: boosted.ms },
    emptyListIdentical: plain.text === plainAgain.text,
    modes,
    termCounts: Object.fromEntries(
      Object.entries(modes).map(([m, text]) => [m, Object.fromEntries(words.map((w) => [w, countTerm(text, w)]))]),
    ),
  };
  if (refFile) {
    const ref = fs.readFileSync(refFile, 'utf8');
    clip.wer = Object.fromEntries(Object.entries(modes).map(([m, text]) => [m, +(wer(ref, text) * 100).toFixed(2)]));
  }
  return clip;
}
