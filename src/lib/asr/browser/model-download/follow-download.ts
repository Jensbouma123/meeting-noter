import type { BroadcastMsg } from '../types/download-lead';
import type { DownloadProgress } from '../types/download-progress';
import { blobUrlFor } from './blob-url';
import { isModelFileCachedByKey, readCachedFile } from './cached-files';
import { FOLLOWER_POLL_MS } from './constants';
import { activeFollowerCancels, downloadCancelError } from './download-cancellation';

export function followDownload(
  key: string,
  channel: BroadcastChannel | null,
  filename: string,
  wantBytes: boolean,
  onProgress?: (p: DownloadProgress) => void,
): Promise<string | null> {
  onProgress?.({ loaded: 0, total: 0, file: filename, resuming: true });

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearInterval(pollTimer);
      activeFollowerCancels.delete(cancelFollower);
      channel?.removeEventListener('message', onMessage);
      fn();
    };
    const cancelFollower = () => finish(() => reject(downloadCancelError(filename)));
    activeFollowerCancels.add(cancelFollower);

    const takeResult = (): void => {
      if (!wantBytes) {
        finish(() => resolve(null));
        return;
      }
      readCachedFile(key).then((file) => {
        if (file) finish(() => resolve(blobUrlFor(file.parts)));
        else reject(new Error(`Download of ${filename} finished in another tab but the result was not found.`));
      }, reject);
    };

    const onMessage = (ev: MessageEvent<BroadcastMsg>) => {
      const msg = ev.data;
      if (!msg || msg.key !== key) return;
      if (msg.type === 'progress') {
        onProgress?.({ loaded: msg.loaded, total: msg.total, file: filename, resuming: false });
      } else if (msg.type === 'done') {
        takeResult();
      } else if (msg.type === 'failed') {
        finish(() => reject(new Error(msg.message)));
      }
    };
    channel?.addEventListener('message', onMessage);

    const pollTimer = setInterval(() => {
      isModelFileCachedByKey(key).then((done) => {
        if (done) takeResult();
      }, () => {});
    }, FOLLOWER_POLL_MS);
  });
}
