import type { OverlapSeparator, SeparatorBackend } from '@/lib/meeting/types/overlap-separate';
import type { SeparatorRequest, SeparatorResponse } from './messages';

export interface SeparatorWorker {
  postMessage(message: SeparatorRequest, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<SeparatorResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  terminate(): void;
}

export interface SeparatorClient extends OverlapSeparator {
  warm: () => Promise<SeparatorBackend>;
  dispose: () => void;
}

export interface PendingRequest {
  resolve: (response: SeparatorResponse) => void;
  reject: (err: Error) => void;
}
