import path from 'node:path';

const VALUE_FLAGS = new Set(['--models-dir', '--words', '--variants', '--strength', '--ref', '--start-share']);

export function parseCliArgs(argv) {
  const flagValue = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : (argv[i + 1] ?? fallback);
  };
  const positional = argv.slice(2);
  return {
    wavs: positional.filter((a, i, all) => !a.startsWith('--') && !VALUE_FLAGS.has(all[i - 1] ?? '')),
    modelsDir: path.resolve(flagValue('models-dir')),
    words: (flagValue('words', '') ?? '').split(',').map((w) => w.trim()).filter(Boolean),
    variants: JSON.parse(flagValue('variants', '{}')),
    strengthArg: flagValue('strength'),
    refs: (flagValue('ref', '') ?? '').split(',').filter(Boolean),
    startShare: flagValue('start-share'),
  };
}
