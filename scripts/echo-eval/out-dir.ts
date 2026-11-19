import fs from 'node:fs';
import path from 'node:path';

export const OUT_DIR =
  process.env.ECHO_EVAL_OUT ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval';
export const AUDIO_DIR = process.env.ECHO_EVAL_AUDIO ?? '/Users/jensbouma/Desktop/Meeting Noter/test-audio';
export const RESULTS_FILE = path.join(OUT_DIR, 'results.jsonl');
fs.mkdirSync(OUT_DIR, { recursive: true });
