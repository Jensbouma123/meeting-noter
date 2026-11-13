import type { EngineWorkerOut } from './engine-protocol';

export type EngineReplyMessage = Extract<EngineWorkerOut, { type: 'reply' }>;
