export class LinkageRows {
  readonly best: Float64Array;
  readonly bestAt: Int32Array;
  private readonly upper: Float32Array;

  constructor(
    private readonly n: number,
    private readonly alive: Uint8Array,
  ) {
    this.upper = new Float32Array((n * (n - 1)) / 2);
    this.best = new Float64Array(n).fill(-Infinity);
    this.bestAt = new Int32Array(n).fill(-1);
  }

  private index(i: number, j: number): number {
    return i < j ? i * this.n - (i * (i + 1)) / 2 + j - i - 1 : j * this.n - (j * (j + 1)) / 2 + i - j - 1;
  }

  get(i: number, j: number): number {
    return this.upper[this.index(i, j)];
  }

  set(i: number, j: number, value: number): void {
    this.upper[this.index(i, j)] = value;
  }

  rescanRow(i: number): void {
    let best = -Infinity;
    let at = -1;
    for (let j = i + 1; j < this.n; j += 1) {
      if (!this.alive[j]) continue;
      const v = this.upper[this.index(i, j)];
      if (v > best) [best, at] = [v, j];
    }
    this.best[i] = best;
    this.bestAt[i] = at;
  }

  offer(i: number, j: number, value: number): void {
    if (value > this.best[i] || (value === this.best[i] && j < this.bestAt[i])) {
      this.best[i] = value;
      this.bestAt[i] = j;
    }
  }

  bestRow(): number {
    let row = -1;
    let best = -Infinity;
    for (let i = 0; i < this.n; i += 1) {
      if (this.alive[i] && this.bestAt[i] >= 0 && this.best[i] > best) [best, row] = [this.best[i], i];
    }
    return row;
  }
}
