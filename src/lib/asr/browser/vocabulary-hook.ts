/**
 * Puts the user's word list (`src/lib/vocabulary/bias.ts`) into
 * `parakeet.js`'s greedy TDT decoder.
 *
 * `parakeet.js` 1.4.4 has no logit hook: its decode loop in `transcribe()`
 * calls `this._runCombinedStep()` once per step and takes the argmax of the
 * `tokenLogits` it returns. Wrapping that method on the one model instance
 * is the narrowest place to add a bonus — the encoder, the TDT durations and
 * the decoder state are untouched, only the token scores the argmax sees.
 * The wrapper takes the same argmax (first index of the maximum, as the loop
 * does) to follow which piece was emitted, and `transcribe()` is wrapped to
 * start every inference with no match in progress.
 *
 * With no biaser the wrapper returns the step's own result object, so an
 * empty word list decodes exactly as before.
 */
import { argmax, type ContextBiaser } from '@/lib/vocabulary/bias';

interface StepResult {
  tokenLogits: Float32Array;
}

/** The parts of a `ParakeetModel` this touches (internal, hence not in its types). */
export interface HookableParakeetModel {
  blankId: number;
  tokenizer: { id2token: readonly string[] };
  _runCombinedStep: (enc: unknown, token: unknown, state?: unknown) => Promise<StepResult>;
  transcribe: (...args: never[]) => Promise<unknown>;
}

const hooked = new WeakSet<object>();

/** Whether `model` has the internals the hook wraps (a `parakeet.js` upgrade may rename them). */
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
