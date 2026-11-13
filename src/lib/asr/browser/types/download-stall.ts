export interface StallGuard {
  arm(): void;
  clear(): void;
  setReader(reader: ReadableStreamDefaultReader<Uint8Array>): void;
  currentReader(): ReadableStreamDefaultReader<Uint8Array> | null;
  throwIfStopped(): void;
  rethrowStopped(err: unknown): never;
}
