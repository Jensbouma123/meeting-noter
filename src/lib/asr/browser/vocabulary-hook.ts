import { argmax } from '@/lib/vocabulary/argmax';
import type { ContextBiaser } from '@/lib/vocabulary/bias';
import type { HookableParakeetModel } from './types';

const hooked = new WeakSet<object>();

export function canHookParakeet(model: Partial<HookableParakeetModel>): model is HookableParakeetModel {
  return (
    typeof model._runCombinedStep === 'function' &&
    typeof model.transcribe === 'function' &&
    typeof model.blankId === 'number' &&
    Array.isArray(model.tokenizer?.id2token)
  );
}

export function hookParakeetVocabulary(model: HookableParakeetModel, getBiaser: () => ContextBiaser | null): void {
  if (hooked.has(model)) return;
  hooked.add(model);
  const step = model._runCombinedStep.bind(model);
  model._runCombinedStep = async (enc, token, state) => {
    const out = await step(enc, token, state);
    const biaser = getBiaser();
    if (!biaser) return out;
    const tokenLogits = biaser.apply(out.tokenLogits);
    const id = argmax(tokenLogits);
    if (id !== model.blankId) biaser.advance(id);
    return { ...out, tokenLogits };
  };
  const transcribe = model.transcribe.bind(model) as (...args: unknown[]) => Promise<unknown>;
  model.transcribe = ((...args: unknown[]) => {
    getBiaser()?.reset();
    return transcribe(...args);
  }) as HookableParakeetModel['transcribe'];
}
