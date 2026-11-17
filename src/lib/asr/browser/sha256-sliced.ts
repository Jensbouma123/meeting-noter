import type { Sha256 } from './sha256';

export const HASH_SLICE_BYTES = 1024 * 1024;

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export async function updateSliced(hasher: Sha256, bytes: Uint8Array): Promise<void> {
  for (let offset = 0; offset < bytes.length; offset += HASH_SLICE_BYTES) {
    hasher.update(bytes.subarray(offset, offset + HASH_SLICE_BYTES));
    await yieldToEventLoop();
  }
}
