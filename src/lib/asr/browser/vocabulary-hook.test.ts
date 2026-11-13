import { describe, expect, it } from 'vitest';
import { ContextBiaser } from '@/lib/vocabulary/bias';
import { hookParakeetVocabulary } from './vocabulary-hook';
import type { HookableParakeetModel } from './types';

const VOCAB = ['▁Fr', 'om', 'am', 'na', '<blk>'];
const BLANK = 4;

function fakeModel(steps: number[][]) {
  let next = 0;
  const model = {
    blankId: BLANK,
    tokenizer: { id2token: VOCAB },
    async _runCombinedStep() {
      return { tokenLogits: Float32Array.from(steps[next++]), step: 1 };
    },
    async transcribe() {
      next = 0;
      const ids: number[] = [];
      for (let i = 0; i < steps.length; i++) {
        const { tokenLogits } = await model._runCombinedStep();
        let best = 0;
        for (let v = 1; v < tokenLogits.length; v++) if (tokenLogits[v] > tokenLogits[best]) best = v;
        if (best !== BLANK) ids.push(best);
      }
      return ids.map((i) => VOCAB[i]).join('');
    },
  };
  return model;
}

const STEPS = [
  [9, 0, 0, 0, 1],
  [0, 5, 3, 0, 1],
  [0, 0, 0, 6, 1],
];

describe('hookParakeetVocabulary', () => {
  it('returns the step result untouched when there is no biaser', async () => {
    const model = fakeModel(STEPS);
    const original = model._runCombinedStep;
    hookParakeetVocabulary(model as unknown as HookableParakeetModel, () => null);
    expect(model._runCombinedStep).not.toBe(original);
    expect(await model.transcribe()).toBe('▁Fromna');
  });

  it('steers the greedy decode towards the word list', async () => {
    const model = fakeModel(STEPS);
    const biaser = new ContextBiaser(VOCAB, ['Framna'], 3);
    hookParakeetVocabulary(model as unknown as HookableParakeetModel, () => biaser);
    expect(await model.transcribe()).toBe('▁Framna');
  });

  it('starts every transcribe with no match in progress', async () => {
    const model = fakeModel(STEPS);
    const biaser = new ContextBiaser(VOCAB, ['Framna'], 3);
    hookParakeetVocabulary(model as unknown as HookableParakeetModel, () => biaser);
    biaser.advance(0);
    biaser.advance(2);
    expect(await model.transcribe()).toBe('▁Framna');
  });

  it('hooks a model only once', async () => {
    const model = fakeModel(STEPS);
    const biaser = new ContextBiaser(VOCAB, ['Framna'], 3);
    hookParakeetVocabulary(model as unknown as HookableParakeetModel, () => biaser);
    const once = model._runCombinedStep;
    hookParakeetVocabulary(model as unknown as HookableParakeetModel, () => biaser);
    expect(model._runCombinedStep).toBe(once);
  });
});
