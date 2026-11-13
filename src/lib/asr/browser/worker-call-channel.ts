import { notReadyResultFor } from './engine-not-ready';
import type { EngineCall, EngineCallResult, EngineWorkerIn, EngineReplyMessage, PendingCall } from './types';

export class WorkerCallChannel {
  private worker: Worker | null = null;
  private crashed: string | null = null;
  private nextCallId = 0;
  private readonly pending = new Map<number, PendingCall>();
  disabled = false;

  get isAttached(): boolean {
    return this.worker !== null;
  }

  attach(worker: Worker): void {
    this.worker = worker;
  }

  post(message: EngineWorkerIn, transfer: Transferable[] = []): void {
    this.worker?.postMessage(message, transfer);
  }

  call(call: EngineCall, transfer: Transferable[] = []): Promise<EngineCallResult> {
    if (this.disabled) return Promise.resolve(notReadyResultFor(call.method));
    if (!this.worker) {
      return Promise.reject(new Error(this.crashed ?? 'The speech model worker is not running'));
    }
    const callId = ++this.nextCallId;
    return new Promise((resolve, reject) => {
      this.pending.set(callId, { method: call.method, resolve, reject });
      this.post({ type: 'call', callId, ...call }, transfer);
    });
  }

  notify(call: EngineCall): void {
    void this.call(call).catch(() => undefined);
  }

  settle(reply: EngineReplyMessage): void {
    const call = this.pending.get(reply.callId);
    if (!call) return;
    this.pending.delete(reply.callId);
    if (reply.ok) call.resolve(reply.value);
    else call.reject(new Error(reply.error ?? 'Unknown speech model error'));
  }

  shutdown(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const call of this.pending.values()) {
      call.resolve(notReadyResultFor(call.method));
    }
    this.pending.clear();
  }

  crash(message: string): void {
    this.crashed = message;
    this.worker?.terminate();
    this.worker = null;
    const inFlight = [...this.pending.values()];
    this.pending.clear();
    for (const call of inFlight) call.reject(new Error(message));
  }
}
