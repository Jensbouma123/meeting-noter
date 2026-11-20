import fs from 'node:fs';
import path from 'node:path';
import { OUT_DIR } from '../out-dir';
import { realTranscribe } from '../lib/asr-client';
import { editDistance, lcs, siSdr, words } from './metrics';
import { planMixes } from './plan-mixes';
import { renderMix } from './render-mix';
import { separate } from './separator';
import type { MixResult, SpeakerScore } from './types/mix-result';

const RESULTS = path.join(OUT_DIR, 'sep-phase0.results.jsonl');
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

async function asr(audio: Float32Array): Promise<string> {
  const r = (await realTranscribe(audio, 16_000, {})) as { utterance_text: string };
  return r.utterance_text ?? '';
}

function score(ref: Float32Array, mix: Float32Array, est: Float32Array, refText: string, mixText: string, sepText: string): SpeakerScore {
  const r = words(refText);
  return {
    refWords: r.length,
    siSdrMix: siSdr(mix, ref),
    siSdrSep: siSdr(est, ref),
    hitMix: lcs(r, words(mixText)),
    hitSep: lcs(r, words(sepText)),
    editSep: editDistance(r, words(sepText)),
  };
}

async function main(): Promise<void> {
  const specs = planMixes();
  fs.writeFileSync(RESULTS, '');
  for (const spec of limit ? specs.slice(0, limit) : specs) {
    const m = renderMix(spec);
    const t0 = performance.now();
    const [a, b] = await separate(m.mix);
    const sepMs = performance.now() - t0;
    const straight = siSdr(a, m.loudRef) + siSdr(b, m.quietRef);
    const crossed = siSdr(b, m.loudRef) + siSdr(a, m.quietRef);
    const [loudEst, quietEst] = straight >= crossed ? [a, b] : [b, a];
    const [loudRef, quietRef, mix, loudSep, quietSep] = await Promise.all(
      [m.loudDry, m.quietDry, m.mix, loudEst, quietEst].map(asr),
    );
    const res: MixResult = {
      spec,
      seconds: m.mix.length / 16_000,
      sepMs,
      loud: score(m.loudRef, m.mix, loudEst, loudRef, mix, loudSep),
      quiet: score(m.quietRef, m.mix, quietEst, quietRef, mix, quietSep),
      text: { loudRef, quietRef, mix, loudSep, quietSep },
    };
    fs.appendFileSync(RESULTS, `${JSON.stringify(res)}\n`);
    const d = (s: SpeakerScore): string => `${(s.siSdrSep - s.siSdrMix).toFixed(1)}dB ${s.hitMix}->${s.hitSep}/${s.refWords}`;
    console.log(`${spec.id} ov=${spec.overlap} q=-${spec.quietDb}dB bleed=${spec.bleed} ${res.seconds.toFixed(1)}s sep=${sepMs.toFixed(0)}ms loud ${d(res.loud)} quiet ${d(res.quiet)}`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
