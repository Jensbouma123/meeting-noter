import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';

// Serves the prebuilt model like a GitHub release asset. mode(): 'ok', 'missing'
// (404), 'cut' (half the bytes, then the connection drops) or 'bad' (other bytes).
export async function startFakeModelHost(file, mode) {
  const state = { requests: 0 };
  const server = createServer((req, res) => {
    state.requests++;
    const m = mode();
    if (m === 'missing' || !req.url.endsWith('/encoder-model.q4f16.onnx')) { res.writeHead(404); return res.end(); }
    if (m === 'bad') return res.end('not the pinned model');
    const size = statSync(file).size;
    res.writeHead(200, { 'content-length': size });
    if (m === 'cut') {
      createReadStream(file, { end: Math.floor(size / 2) }).on('end', () => setTimeout(() => res.socket.destroy(), 50)).pipe(res, { end: false });
      return;
    }
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  state.server = server;
  state.url = `http://127.0.0.1:${server.address().port}/download/model-parakeet-v3-webgpu-1/encoder-model.q4f16.onnx`;
  return state;
}
