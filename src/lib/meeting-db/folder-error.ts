import type { FolderErrorCode } from './types';

export class FolderError extends Error {
  constructor(readonly code: FolderErrorCode) {
    super(code);
  }
}
