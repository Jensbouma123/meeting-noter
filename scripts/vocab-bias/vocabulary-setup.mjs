import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot } from './repo-root.mjs';

const importAppModule = (relative) => import(pathToFileURL(path.join(repoRoot, relative)).href);

export async function loadAppVocabularyModules() {
  const bias = await importAppModule('src/lib/vocabulary/bias.ts');
  const replace = await importAppModule('src/lib/vocabulary/replace.ts');
  const hook = await importAppModule('src/lib/asr/browser/vocabulary-hook.ts');
  return { ...bias, ...replace, hookParakeetVocabulary: hook.hookParakeetVocabulary };
}

export function createBiaserSlot(app, model, startShare) {
  const slot = new app.BiaserSlot();
  if (startShare !== null) {
    let current = null;
    slot.setWords = (w, s) => {
      current = w.length ? new app.ContextBiaser(model.tokenizer.id2token, w, s, Number(startShare)) : null;
    };
    slot.get = () => current;
  }
  slot.setVocab(model.tokenizer.id2token);
  app.hookParakeetVocabulary(model, () => slot.get());
  return slot;
}
