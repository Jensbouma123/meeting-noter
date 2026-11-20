import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EVAL_DIR = path.resolve(root, process.env.ECHO_EVAL_DIR ?? '.echo-eval');
const CORPUS = process.env.ECHO_EVAL_CORPUS ?? path.join(EVAL_DIR, 'corpus');
const TMP = path.join(CORPUS, '_tmp');
const MLS = 'facebook/multilingual_librispeech';
const HF = 'https://huggingface.co';
const LIBRI = 'https://www.openslr.org/resources/12/test-clean.tar.gz';
const NL_TRAIN_SPEAKERS = 26;
const FILES_PER_SPEAKER = 2;
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

function crop(src, id, seconds) {
  const out = path.join(CORPUS, `${id}.wav`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-t', String(seconds), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', out]);
  if (r.status !== 0) throw new Error(`ffmpeg ${src}: ${r.stderr}`);
}

async function sampleTar(url, dir, maxFiles) {
  fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(url);
  const tar = spawn('tar', ['-xzf', '-', '-C', dir], { stdio: ['pipe', 'ignore', 'ignore'] });
  tar.stdin.on('error', () => {});
  const done = new Promise((r) => tar.on('close', r));
  for await (const chunk of res.body) {
    if (!tar.stdin.write(chunk)) await new Promise((r) => tar.stdin.once('drain', r));
    if (walk(dir).filter((f) => f.endsWith('.flac')).length > maxFiles + 2) break;
  }
  tar.stdin.end();
  await done;
}

async function dutch(manifest) {
  const bySpeaker = new Map();
  for (const split of ['test', 'dev', 'train']) {
    const res = await fetch(`${HF}/api/datasets/${MLS}/tree/main/data/mls_dutch/${split}/audio?limit=1000`);
    for (const f of await res.json()) {
      const speaker = path.basename(f.path).split('_')[0];
      if (!bySpeaker.has(speaker)) bySpeaker.set(speaker, { split, path: f.path });
    }
  }
  const all = [...bySpeaker.entries()];
  const train = all.filter(([, v]) => v.split === 'train').sort((a, b) => hash(a[0]) - hash(b[0])).slice(0, NL_TRAIN_SPEAKERS);
  for (const [speaker, v] of [...all.filter(([, x]) => x.split !== 'train'), ...train]) {
    const dir = path.join(TMP, `nl-${speaker}`);
    await sampleTar(`${HF}/datasets/${MLS}/resolve/main/${v.path}`, dir, 8);
    const files = walk(dir).filter((f) => f.endsWith('.flac')).sort((a, b) => hash(a) - hash(b)).slice(0, FILES_PER_SPEAKER);
    for (const f of files) {
      const id = `nl-${path.basename(f, '.flac')}`;
      const seconds = 3.5 + (hash(id) % 9) * 0.5;
      crop(f, id, seconds);
      manifest.push({ id, language: 'nl', speaker: `nl:mls${speaker}`, seconds, source: `${MLS} (${v.split})`, license: 'CC-BY-4.0' });
    }
    console.log(`[fetch-corpus] nl speaker ${speaker}: ${manifest.length} utterances`);
  }
}

async function english(manifest) {
  const dir = path.join(TMP, 'libri');
  fs.mkdirSync(dir, { recursive: true });
  const tgz = path.join(dir, 'test-clean.tar.gz');
  spawnSync('curl', ['-sL', '--retry', '5', '-C', '-', '-o', tgz, LIBRI]);
  spawnSync('tar', ['-xzf', tgz, '-C', dir]);
  const bySpeaker = new Map();
  for (const f of walk(dir).filter((x) => x.endsWith('.flac'))) {
    const speaker = path.basename(f).split('-')[0];
    bySpeaker.set(speaker, [...(bySpeaker.get(speaker) ?? []), f]);
  }
  for (const [speaker, files] of bySpeaker) {
    const f = files.sort((a, b) => hash(a) - hash(b))[0];
    const id = `en-${path.basename(f, '.flac')}`;
    const seconds = 3.5 + (hash(id) % 9) * 0.5;
    crop(f, id, seconds);
    manifest.push({ id, language: 'en', speaker: `en:ls${speaker}`, seconds, source: 'LibriSpeech test-clean', license: 'CC-BY-4.0' });
  }
  console.log(`[fetch-corpus] en: ${bySpeaker.size} speakers`);
}

fs.mkdirSync(CORPUS, { recursive: true });
const manifest = [];
const nlFile = path.join(CORPUS, 'manifest.nl.json');
if (fs.existsSync(nlFile)) manifest.push(...JSON.parse(fs.readFileSync(nlFile, 'utf8')));
else {
  await dutch(manifest);
  fs.writeFileSync(nlFile, JSON.stringify(manifest));
}
await english(manifest);
fs.rmSync(TMP, { recursive: true, force: true });
const body = JSON.stringify(manifest, null, 1) + '\n';
fs.writeFileSync(path.join(CORPUS, 'manifest.json'), body);
fs.writeFileSync(path.join(here, 'corpus-manifest.json'), body);
console.log(`[fetch-corpus] ${manifest.length} utterances, ${new Set(manifest.map((m) => m.speaker)).size} speakers -> ${CORPUS}`);
