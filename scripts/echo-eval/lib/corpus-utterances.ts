import fs from 'node:fs';
import path from 'node:path';
import type { CorpusEntry } from '../types/corpus-entry';
import type { Utterance } from '../types/utterance';
import { CORPUS_DIR } from '../out-dir';
import { hashString } from './rng';
import { readWav16kMono } from './wav-io';

export function loadCorpusUtterances(dir = CORPUS_DIR): Utterance[] {
  const file = path.join(dir, 'manifest.json');
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as CorpusEntry[];
  return entries.map((e) => {
    const audio = readWav16kMono(path.join(dir, `${e.id}.wav`));
    return { id: e.id, speaker: e.speaker, seconds: audio.length / 16_000, split: hashString(e.id) % 2 === 0 ? 'dev' : 'heldout', audio };
  });
}
