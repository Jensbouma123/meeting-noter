import { FolderError } from './db';
import { failure, storageFailure } from './http';

const STATUS = { 'not-found': 404, 'bad-name': 400, 'bad-parent': 400, cycle: 409 } as const;

/** A `FolderError` as its HTTP failure; anything else is a storage failure. */
export function folderFailure(err: unknown): Response {
  return err instanceof FolderError ? failure(err.code, STATUS[err.code]) : storageFailure(err);
}
