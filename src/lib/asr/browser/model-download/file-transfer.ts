import type { PartialFileRecord } from '../types/download-cache-records';
import type { TransferArgs, TransferResult } from '../types/download-transfer';
import { Sha256 } from '../sha256';
import { getMetaRecord } from './cache-primitives';
import { deleteCachedFile } from './cached-files';
import { ChunkWriter } from './chunk-writer';
import { PARTIAL_STORE } from './constants';
import { activeDownloadReaders } from './download-cancellation';
import { decideResume, shouldVerifyHash } from './resume-decision';
import { streamBodyIntoWriter } from './stream-body';

export async function transferFile(args: TransferArgs): Promise<TransferResult> {
  const { url, filename, key, meta, wantBytes, guard, aborter, channel, onProgress } = args;
  let startByte = 0;
  let resuming = false;

  guard.arm();
  const head = await fetch(url, { method: 'HEAD', signal: aborter.signal }).catch(guard.rethrowStopped);
  guard.throwIfStopped();
  if (!head.ok) {
    throw new Error(`Failed to download ${filename}: ${head.status} ${head.statusText} (${url})`);
  }
  const totalBytes = meta?.size ?? Number(head.headers.get('content-length') ?? 0);
  const etag = head.headers.get('x-linked-etag') ?? head.headers.get('etag');

  const verifyHash = Boolean(meta?.sha256) && shouldVerifyHash(totalBytes);
  const writer = new ChunkWriter(
    key,
    totalBytes,
    etag,
    wantBytes,
    args.onWriteFailure,
    verifyHash ? new Sha256() : null,
  );

  guard.arm();
  const existingPartial = await getMetaRecord<PartialFileRecord>(PARTIAL_STORE, key).catch(() => undefined);
  guard.throwIfStopped();
  const decision = decideResume(
    existingPartial
      ? {
          loadedBytes: existingPartial.loadedBytes,
          totalBytes: existingPartial.totalBytes,
          etag: existingPartial.etag,
        }
      : null,
    { totalBytes, etag },
  );

  guard.arm();
  if (decision === 'resume' && existingPartial && (await writer.resumeFrom(existingPartial))) {
    guard.throwIfStopped();
    startByte = existingPartial.loadedBytes;
    resuming = true;
    onProgress?.({ loaded: startByte, total: totalBytes, file: filename, resuming: true });
  } else {
    guard.throwIfStopped();
    if (existingPartial) await writer.reset();
    else await deleteCachedFile(key).catch(() => {});
    guard.throwIfStopped();
  }

  guard.arm();
  const res = await fetch(url, {
    ...(startByte > 0 ? { headers: { Range: `bytes=${startByte}-` } } : {}),
    signal: aborter.signal,
  }).catch(guard.rethrowStopped);
  if (!res.ok && res.status !== 206) {
    throw new Error(`Failed to download ${filename}: ${res.status} ${res.statusText} (${url})`);
  }
  if (res.status !== 206 && startByte > 0) {
    await writer.reset();
    resuming = false;
  }

  if (!res.body) throw new Error(`Failed to download ${filename}: response had no body (${url})`);
  const reader = res.body.getReader();
  guard.setReader(reader);
  activeDownloadReaders.add(reader);

  await streamBodyIntoWriter({
    reader,
    writer,
    guard,
    channel,
    key,
    filename,
    totalBytes,
    startByte,
    resuming,
    onProgress,
  });
  return { writer, totalBytes, resuming, verifyHash };
}
