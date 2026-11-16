export class FakeWorker {
  static instances: FakeWorker[] = [];

  readonly listeners = new Set<(ev: MessageEvent<unknown>) => void>();
  readonly posted: Array<unknown> = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(_type: string, fn: (ev: MessageEvent<unknown>) => void): void {
    this.listeners.add(fn);
  }

  removeEventListener(_type: string, fn: (ev: MessageEvent<unknown>) => void): void {
    this.listeners.delete(fn);
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: unknown): void {
    for (const fn of this.listeners) fn({ data: message } as MessageEvent<unknown>);
  }
}
