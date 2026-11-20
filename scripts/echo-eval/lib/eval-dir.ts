import path from 'node:path';

export const EVAL_DIR = path.resolve(process.env.ECHO_EVAL_DIR ?? '.echo-eval');
export const DEFAULT_AUDIO_DIR = path.resolve('..', 'test-audio');
