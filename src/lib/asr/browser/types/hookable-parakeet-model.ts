interface ParakeetStepResult {
  tokenLogits: Float32Array;
}

export interface HookableParakeetModel {
  blankId: number;
  tokenizer: { id2token: readonly string[] };
  _runCombinedStep: (enc: unknown, token: unknown, state?: unknown) => Promise<ParakeetStepResult>;
  transcribe: (...args: never[]) => Promise<unknown>;
}
