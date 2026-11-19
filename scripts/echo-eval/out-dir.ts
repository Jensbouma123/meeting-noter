import fs from 'node:fs';
import path from 'node:path';

export const OUT_DIR =
  process.env.ECHO_EVAL_OUT ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval';
export const AUDIO_DIR = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
export const CORPUS_DIR =
  process.env.ECHO_EVAL_CORPUS ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval/corpus';
export const RESULTS_FILE = path.join(OUT_DIR, 'results.jsonl');
export const resultsFileFor = (fake: boolean): string => path.join(OUT_DIR, fake ? 'results.fake.jsonl' : 'results.jsonl');
export const meetingResultsFile = (fake: boolean): string => path.join(OUT_DIR, fake ? 'meetings.fake.jsonl' : 'meetings.jsonl');
export const markerFileFor = (fake: boolean): string => path.join(OUT_DIR, fake ? 'finished.fake.json' : 'finished.json');
fs.mkdirSync(OUT_DIR, { recursive: true });
