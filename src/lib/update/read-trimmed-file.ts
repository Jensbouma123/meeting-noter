import { readFileSync } from 'node:fs';

export function readTrimmedFile(file: string): string | null {
  try {
    return readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
}
