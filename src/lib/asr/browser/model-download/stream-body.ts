import type { BodyStreamArgs, BroadcastMsg } from '../types/download-transfer';
import { PARTIAL_PERSIST_INTERVAL_MS, PROGRESS_BROADCAST_INTERVAL_MS } from './constants';

export async function streamBodyIntoWriter(args: BodyStreamArgs): Promise<void> {
  const { reader, writer, guard, channel, key, filename, totalBytes, startByte, resuming, onProgress } = args;
  let lastPersist = Date.now();
  let lastBroadcast = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      guard.arm();
      await writer.append(value);

      onProgress?.({ loaded: writer.loaded, total: totalBytes, file: filename, resuming: false });
      const now = Date.now();
      if (now - lastBroadcast >= PROGRESS_BROADCAST_INTERVAL_MS || writer.loaded >= totalBytes) {
        lastBroadcast = now;
        channel?.postMessage({
          type: 'progress',
          key,
          loaded: writer.loaded,
          total: totalBytes,
        } satisfies BroadcastMsg);
      }

      if (now - lastPersist > PARTIAL_PERSIST_INTERVAL_MS) {
        lastPersist = now;
        await writer.flushPartial();
      }
    }
  } catch (err) {
    guard.throwIfStopped();
    if (writer.loaded > (resuming ? startByte : 0)) {
      await writer.flushPartial().catch(() => {});
    }
    throw err;
  }
}
