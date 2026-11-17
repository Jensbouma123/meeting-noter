import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';

export const MODEL_HOST_MODES = Object.freeze({ ok: 'ok', missing: 'missing', cutHalfway: 'cut', wrongBytes: 'bad' });

export async function startFakeReleaseModelHost(file, currentMode) {
  const state = { requests: 0 };
  const server = createServer((req, res) => {
    state.requests++;
    const mode = currentMode();
    if (mode === MODEL_HOST_MODES.missing || !req.url.endsWith('/encoder-model.q4f16.onnx')) { res.writeHead(404); return res.end(); }
    if (mode === MODEL_HOST_MODES.wrongBytes) return res.end('not the pinned model');
    const size = statSync(file).size;
    res.writeHead(200, { 'content-length': size });
    if (mode === MODEL_HOST_MODES.cutHalfway) {
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
