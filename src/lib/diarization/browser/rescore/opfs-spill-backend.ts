import type { OpfsDirectoryLike, SpillBackend, SyncAccessHandleLike } from '../types/rescore';

export class OpfsSpillBackend implements SpillBackend {
  readonly kind = 'opfs' as const;

  constructor(
    private readonly dir: OpfsDirectoryLike,
    private readonly name: string,
    private readonly handle: SyncAccessHandleLike,
  ) {}

  async write(offset: number, data: Int16Array): Promise<void> {
    this.handle.write(data, { at: offset * 2 });
  }

  async read(offset: number, length: number): Promise<Int16Array> {
    const out = new Int16Array(length);
    const bytes = this.handle.read(out, { at: offset * 2 });
    return out.subarray(0, Math.floor(bytes / 2));
  }

  async truncate(length: number): Promise<void> {
    this.handle.truncate(length * 2);
  }

  async remove(): Promise<void> {
    this.handle.close();
    await this.dir.removeEntry(this.name);
  }
}
