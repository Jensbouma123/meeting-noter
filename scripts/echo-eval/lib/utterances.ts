import { loadAmiUtterances } from './ami-utterances';
import { loadCorpusUtterances } from './corpus-utterances';
import type { Utterance } from '../types/utterance';

export function loadUtterances(dir: string): Utterance[] {
  return [...loadAmiUtterances(dir), ...loadCorpusUtterances()];
}
