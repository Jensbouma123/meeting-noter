import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = process.env.ECHO_EVAL_CORPUS ?? '/Users/jensbouma/Library/Application Support/OrchestratorAI/exchange/echo-eval/corpus';
const DATASET = 'facebook/multilingual_librispeech';
const API = 'https://datasets-server.huggingface.co/rows';
const PLAN = [
  { lang: 'nl', config: 'dutch', target: 72, perSpeaker: 2 },
  { lang: 'en', config: 'english', target: 48, perSpeaker: 2 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

async function getJson(url) {
  for (let i = 0; i < 6; i += 1) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await sleep(1500 * (i + 1));
  }
  throw new Error(`failed: ${url}`);
}

async function getBytes(url) {
  for (let i = 0; i < 6; i += 1) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    await sleep(1500 * (i + 1));
  }
  throw new Error('audio download failed');
}

function toWav(opus, seconds, file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', 'pipe:0', '-t', String(seconds), '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', file], { input: opus });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
}

async function collect({ lang, config, target, perSpeaker }, manifest) {
  const first = await getJson(`${API}?dataset=${DATASET}&config=${config}&split=test&offset=0&length=1`);
  const total = first.num_rows_total;
  const perSpk = new Map();
  const used = new Set();
  let taken = 0;
  for (let round = 0; round < perSpeaker && taken < target; round += 1) {
    for (let offset = 0; offset < total && taken < target; offset += 100) {
      const page = await getJson(`${API}?dataset=${DATASET}&config=${config}&split=test&offset=${offset}&length=100`);
      const ok = page.rows.filter((r) => r.row.audio_duration >= 8 && !used.has(r.row.id));
      const bySpk = new Map();
      for (const r of ok) if ((perSpk.get(r.row.speaker_id) ?? 0) <= round) bySpk.set(r.row.speaker_id, [...(bySpk.get(r.row.speaker_id) ?? []), r]);
      for (const rows of bySpk.values()) {
        if (taken >= target) break;
        const pick = rows.sort((a, b) => hash(a.row.id) - hash(b.row.id))[0];
        const id = `${lang}-${pick.row.id}`;
        const seconds = 3.5 + (hash(id) % 9) * 0.5;
        toWav(await getBytes(pick.row.audio[0].src), seconds, path.join(CORPUS, `${id}.wav`));
        used.add(pick.row.id);
        perSpk.set(pick.row.speaker_id, (perSpk.get(pick.row.speaker_id) ?? 0) + 1);
        manifest.push({ id, language: lang, speaker: `${lang}:mls${pick.row.speaker_id}`, seconds, source: DATASET, config, row: pick.row_idx, license: 'CC-BY-4.0' });
        taken += 1;
      }
      console.log(`[fetch-corpus] ${lang} ${taken}/${target} (offset ${offset}/${total})`);
    }
  }
}

fs.mkdirSync(CORPUS, { recursive: true });
const manifest = [];
for (const p of PLAN) await collect(p, manifest);
const body = JSON.stringify(manifest, null, 1) + '\n';
fs.writeFileSync(path.join(CORPUS, 'manifest.json'), body);
fs.writeFileSync(path.join(here, 'corpus-manifest.json'), body);
console.log(`[fetch-corpus] ${manifest.length} utterances, ${new Set(manifest.map((m) => m.speaker)).size} speakers -> ${CORPUS}`);
