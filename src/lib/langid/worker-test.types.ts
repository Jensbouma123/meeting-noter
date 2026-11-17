import type { Mock } from 'vitest';
import type { PostedMessage } from './types';

export type WorkerFakes = Record<'load' | 'detect' | 'mel' | 'speech', Mock>;

export interface WorkerHarness {
  posted: PostedMessage[];
  send(data: unknown): void;
}

export type MessageHandler = (event: { data: unknown }) => void;
