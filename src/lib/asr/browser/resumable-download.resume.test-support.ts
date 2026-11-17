export const REPO = 'test-org/test-repo';
export const FILE = 'weights.bin';
export const REVISION = 'main';
export const FULL_CONTENT = new Uint8Array(1000).map((_, i) => i % 256);
export const ETAG = '"fixed-etag-for-this-file"';

export function treeApiResponse(): Response {
  return new Response(JSON.stringify([{ type: 'file', path: FILE, size: FULL_CONTENT.length }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export function headResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: { 'content-length': String(FULL_CONTENT.length), etag: ETAG },
  });
}

export function droppedConnectionStream(breakAt: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= breakAt) {
        controller.error(new Error('simulated: connection dropped (page refreshed)'));
        return;
      }
      const chunkSize = Math.min(64, breakAt - sent);
      controller.enqueue(FULL_CONTENT.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

export function fullStream(from = 0): ReadableStream<Uint8Array> {
  let sent = from;
  return new ReadableStream({
    pull(controller) {
      if (sent >= FULL_CONTENT.length) {
        controller.close();
        return;
      }
      const chunkSize = Math.min(64, FULL_CONTENT.length - sent);
      controller.enqueue(FULL_CONTENT.slice(sent, sent + chunkSize));
      sent += chunkSize;
    },
  });
}

export function logRequest(
  log: Array<{ url: string; method: string; range: string | null }>,
  input: string | URL,
  init?: RequestInit,
): void {
  log.push({
    url: String(input),
    method: init?.method ?? 'GET',
    range: (init?.headers as Record<string, string> | undefined)?.Range ?? null,
  });
}
