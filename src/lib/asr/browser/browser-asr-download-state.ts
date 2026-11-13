import type { DownloadHandler } from './types/browser-asr-download';

export const downloadHandlers = new Map<string, DownloadHandler>();

export const downloadState = {
  promises: {} as Record<string, Promise<void>>,
};

export const currentAttempts = new Map<string, object>();

export const sizeProbes = new Map<string, Promise<void>>();

export function registerDownloadHandler(kind: string, handler: DownloadHandler): void {
  downloadHandlers.set(kind, handler);
}
