import { NEMOTRON } from './nemotron-constants';
import type { OrtLike, OrtTensorLike, SessionLike } from './types';

export class NemotronPredictionState {
  private h: OrtTensorLike;
  private c: OrtTensorLike;
  private lastToken: number = NEMOTRON.blankId;

  private pending: { out: Float32Array; h: OrtTensorLike; c: OrtTensorLike } | null = null;
  private readonly ort: OrtLike;
  private readonly session: SessionLike;

  constructor(ort: OrtLike, session: SessionLike) {
    this.ort = ort;
    this.session = session;
    const size = NEMOTRON.predLayers * NEMOTRON.predHidden;
    this.h = new ort.Tensor('float32', new Float32Array(size), [NEMOTRON.predLayers, 1, NEMOTRON.predHidden]);
    this.c = new ort.Tensor('float32', new Float32Array(size), [NEMOTRON.predLayers, 1, NEMOTRON.predHidden]);
  }

  async output(): Promise<Float32Array> {
    if (!this.pending) {
      const out = await this.session.run({
        targets: new this.ort.Tensor('int64', BigInt64Array.from([BigInt(this.lastToken)]), [1, 1]),
        h_in: this.h,
        c_in: this.c,
      });

      this.pending = { out: out.decoder_output.data as Float32Array, h: out.h_out, c: out.c_out };
    }
    return this.pending.out;
  }

  commit(token: number): void {
    if (!this.pending) throw new Error('commit() without output()');
    this.h.dispose?.();
    this.c.dispose?.();
    this.h = this.pending.h;
    this.c = this.pending.c;
    this.lastToken = token;
    this.pending = null;
  }

  dispose(): void {
    this.h.dispose?.();
    this.c.dispose?.();
    this.pending?.h.dispose?.();
    this.pending?.c.dispose?.();
  }
}
