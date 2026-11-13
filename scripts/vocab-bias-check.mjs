#!/usr/bin/env node
import './vocab-bias/register-resolver.mjs';
import { parseCliArgs } from './vocab-bias/cli-args.mjs';
import { loadParakeetModel } from './vocab-bias/load-model.mjs';
import { measureClip } from './vocab-bias/measure-clip.mjs';
import { createBiaserSlot, loadAppVocabularyModules } from './vocab-bias/vocabulary-setup.mjs';

const { wavs, modelsDir, words, variants, strengthArg, refs, startShare } = parseCliArgs(process.argv);

const app = await loadAppVocabularyModules();
const strength = strengthArg === null ? app.DEFAULT_BIAS_STRENGTH : Number(strengthArg);
const model = await loadParakeetModel(modelsDir);
const slot = createBiaserSlot(app, model, startShare);
const prepared = app.prepareVocabulary(words.map((word) => ({ word, variants: variants[word] ?? [] })));

const report = { words, variants, strength, clips: [] };
for (const [i, wav] of wavs.entries()) {
  const clip = await measureClip({ wav, refFile: refs[i], model, slot, app, words, prepared, strength });
  report.clips.push(clip);
  process.stderr.write(`${clip.wav} done\n`);
}
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
