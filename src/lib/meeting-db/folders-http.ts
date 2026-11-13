import { FolderError } from './folder-error';
import { failure, storageFailure } from './http';

const STATUS = { 'not-found': 404, 'bad-name': 400, 'bad-parent': 400, cycle: 409 } as const;

export function folderFailure(err: unknown): Response {
  return err instanceof FolderError ? failure(err.code, STATUS[err.code]) : storageFailure(err);
}
