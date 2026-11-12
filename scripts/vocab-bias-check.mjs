#!/usr/bin/env node
/**
 * The custom-vocabulary check: Parakeet (WASM/int8, the app's CPU path) over
 * each WAV three ways — no word list, the list as decode-time biasing only,
 * and biasing plus the after-the-fact fix-up — using the app's own
 * `src/lib/vocabulary/*.ts` and `vocabulary-hook.ts` under Node's type
 * stripping.
 *
 * Usage:
 *   node scripts/vocab-bias-check.mjs --models-dir DIR --words 'Framna,Hezelaer' \
 *     [--variants '{"Framna":["from now"]}'] [--strength 3] [--start-share 0] \
 *     [--ref clip.ref.txt] clip1.wav clip2.wav … > report.json
 *
 * `--models-dir` holds `encoder-model.int8.onnx`, `decoder_joint-model.int8.onnx`
 * and `vocab.txt` from istupakov/parakeet-tdt-0.6b-v3-onnx. `--ref` (one per
 * WAV, comma-separated, optional) adds WER per mode.
 */
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { wer } from './asr-bench-safari.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// `@/x` and extensionless relative imports, the way the app's bundler resolves them.
register(
  `data:text/javascript,${encodeURIComponent(`
    import fs from 'node:fs';
    import { fileURLToPath, pathToFileURL } from 'node:url';
    const src = ${JSON.stringify(pathToFileURL(path.join(repoRoot, 'src/')).href)};
    export async function resolve(spec, ctx, next) {
      let s = spec.startsWith('@/') ? src + spec.slice(2) : spec;
      if ((s.startsWith('.') || s.startsWith('file:')) && !/\\.[cm]?[jt]s$/.test(s)) {
        const url = new URL(s, ctx.parentURL);
        if (fs.existsSync(fileURLToPath(url) + '.ts')) s = url.href + '.ts';
      }
      return next(s, ctx);
    }
  `)}`,
);

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (process.argv[i + 1] ?? fallback);
}
const flagged = new Set(['--models-dir', '--words', '--variants', '--strength', '--ref', '--start-share']);
const wavs = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !flagged.has(all[i - 1] ?? ''));
const modelsDir = path.resolve(arg('models-dir'));
const words = (arg('words', '') ?? '').split(',').map((w) => w.trim()).filter(Boolean);
const variants = JSON.parse(arg('variants', '{}'));
const strengthArg = arg('strength');
const refs = (arg('ref', '') ?? '').split(',').filter(Boolean);

function readWav16kMono(file) {
  const buf = fs.readFileSync(file);
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'data') {
      const out = new Float32Array(Math.floor(size / 2));
      for (let i = 0; i < out.length; i += 1) out[i] = buf.readInt16LE(body + 2 * i) / 32768;
      return out;
    }
    offset = body + size + (size & 1);
  }
  throw new Error(`no data chunk in ${file}`);
}

const { BiaserSlot, DEFAULT_BIAS_STRENGTH } = await import(
  pathToFileURL(path.join(repoRoot, 'src/lib/vocabulary/bias.ts')).href
);
// The app's default unless asked otherwise.
const strength = strengthArg === null ? DEFAULT_BIAS_STRENGTH : Number(strengthArg);
const { prepareVocabulary, applyVocabularyToText } = await import(
  pathToFileURL(path.join(repoRoot, 'src/lib/vocabulary/replace.ts')).href
);
const { hookParakeetVocabulary } = await import(
  pathToFileURL(path.join(repoRoot, 'src/lib/asr/browser/vocabulary-hook.ts')).href
);

const wasmPaths = pathToFileURL(path.join(repoRoot, 'node_modules/onnxruntime-web/dist/')).href;
const quiet = console.log;
console.log = () => {};
const ort = await import('onnxruntime-web');
ort.env.wasm.wasmPaths = wasmPaths;
const { ParakeetModel } = await import('parakeet.js');
const model = await ParakeetModel.fromUrls({
  encoderUrl: path.join(modelsDir, 'encoder-model.int8.onnx'),
  decoderUrl: path.join(modelsDir, 'decoder_joint-model.int8.onnx'),
  tokenizerUrl: `data:text/plain;base64,${fs.readFileSync(path.join(modelsDir, 'vocab.txt')).toString('base64')}`,
  backend: 'wasm',
  wasmPaths,
  cpuThreads: 4,
  preprocessorBackend: 'js',
});
console.log = quiet;

const { ContextBiaser } = await import(pathToFileURL(path.join(repoRoot, 'src/lib/vocabulary/bias.ts')).href);
const startShare = arg('start-share');
const slot = new BiaserSlot();
if (startShare !== null) {
  // Experiment knob: the app always uses `WORD_START_SHARE`.
  let current = null;
  slot.setWords = (w, s) => {
    current = w.length ? new ContextBiaser(model.tokenizer.id2token, w, s, Number(startShare)) : null;
  };
  slot.get = () => current;
}
slot.setVocab(model.tokenizer.id2token);
hookParakeetVocabulary(model, () => slot.get());
const entries = words.map((word) => ({ word, variants: variants[word] ?? [] }));
const prepared = prepareVocabulary(entries);

const SR = 16000;
const WINDOW = 20 * SR;
const HOP = 16 * SR;

/** The app's post-stop shape: overlapping 20 s windows, each word from the window it is most central in. */
async function transcribeFile(audio) {
  const out = [];
  let ms = 0;
  for (let from = 0; from < audio.length; from += HOP) {
    const to = Math.min(audio.length, from + WINDOW);
    const t0 = performance.now();
    const result = await model.transcribe(audio.subarray(from, to), SR, { returnTimestamps: true, enableProfiling: false });
    ms += performance.now() - t0;
    const keepFrom = from === 0 ? -Infinity : (from + (WINDOW - HOP) / 2) / SR;
    const keepTo = to >= audio.length ? Infinity : (from + HOP + (WINDOW - HOP) / 2) / SR;
    for (const w of result.words ?? []) {
      const mid = from / SR + (w.start_time + w.end_time) / 2;
      if (mid >= keepFrom && mid < keepTo) out.push(w.text);
    }
    if (to >= audio.length) break;
  }
  return { text: out.join(' '), ms: Math.round(ms) };
}

function countTerm(text, word) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'gu');
  return (text.match(re) ?? []).length;
}

const report = { words, variants, strength, clips: [] };
for (const [i, wav] of wavs.entries()) {
  const audio = readWav16kMono(wav);
  slot.setWords([], strength);
  const plain = await transcribeFile(audio);
  slot.setWords(words, strength);
  const boosted = await transcribeFile(audio);
  slot.setWords([], strength);
  const plainAgain = await transcribeFile(audio);
  const fixed = applyVocabularyToText(boosted.text, prepared);
  const fixedOnly = applyVocabularyToText(plain.text, prepared);
  const modes = {
    none: plain.text,
    boost: boosted.text,
    fixupOnly: fixedOnly,
    boostAndFixup: fixed,
  };
  const clip = {
    wav: path.basename(wav),
    seconds: +(audio.length / SR).toFixed(1),
    decodeMs: { none: plain.ms, boost: boosted.ms },
    emptyListIdentical: plain.text === plainAgain.text,
    modes,
    termCounts: Object.fromEntries(
      Object.entries(modes).map(([m, text]) => [m, Object.fromEntries(words.map((w) => [w, countTerm(text, w)]))]),
    ),
  };
  if (refs[i]) {
    const ref = fs.readFileSync(refs[i], 'utf8');
    clip.wer = Object.fromEntries(Object.entries(modes).map(([m, text]) => [m, +(wer(ref, text) * 100).toFixed(2)]));
  }
  report.clips.push(clip);
  process.stderr.write(`${clip.wav} done\n`);
}
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
