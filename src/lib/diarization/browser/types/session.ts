import type { InferenceSession } from 'onnxruntime-web';
import type { SessionBackend } from './model';

export type CreateSessionFn = (
  model: string | Uint8Array,
  options: InferenceSession.SessionOptions,
) => Promise<InferenceSession>;

export interface CreatedSession {
  session: InferenceSession;
  backend: SessionBackend;
  webGpuUnavailable: string | null;
}
