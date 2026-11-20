import fs from 'node:fs';
import path from 'node:path';
import { shardSuffix } from './lib/shard';
import type { EvalSet } from './types/eval-set';
import type { Shard } from './types/shard';

export const OUT_DIR =
  process.env.ECHO_EVAL_OUT ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval';
export const AUDIO_DIR = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
export const CORPUS_DIR =
  process.env.ECHO_EVAL_CORPUS ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval/corpus';
export const EXTERNAL_DIR = process.env.ECHO_EVAL_EXTERNAL ?? null;
export const RESULTS_FILE = path.join(OUT_DIR, 'results.jsonl');
export const meetingResultsFile = (fake: boolean): string => path.join(OUT_DIR, fake ? 'meetings.fake.jsonl' : 'meetings.jsonl');
const RESULTS_PREFIX: Record<EvalSet, string> = { cases: 'results', meetings: 'meetings', external: 'external' };
export const resultsFileFor = (fake: boolean, set: EvalSet = 'cases', shard: Shard | null = null): string =>
  path.join(OUT_DIR, `${RESULTS_PREFIX[set]}${fake ? '.fake' : ''}${shardSuffix(shard)}.jsonl`);
export const markerFileFor = (fake: boolean, set: EvalSet = 'cases', shard: Shard | null = null): string =>
  path.join(OUT_DIR, `finished${set === 'cases' ? '' : `.${set}`}${fake ? '.fake' : ''}${shardSuffix(shard)}.json`);
fs.mkdirSync(OUT_DIR, { recursive: true });
