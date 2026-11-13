import { FolderError } from './folder-error';

export const MAX_FOLDER_NAME = 200;

export function cleanFolderName(name: unknown): string {
  const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (!clean || clean.length > MAX_FOLDER_NAME) throw new FolderError('bad-name');
  return clean;
}
