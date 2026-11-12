/** Speech-model worker: owns the speech model (Parakeet or Nemotron, see
 *  `engine-factory.ts`) and its ONNX sessions, so
 *  reading the model out of IndexedDB, session creation, the JS mel
 *  preprocessor and every inference run off the main thread. On the WASM
 *  backend ORT runs synchronously (`ort.env.wasm.proxy = false`), so on the
 *  page each post-stop chunk froze the UI for tens of seconds.
 *
 *  One engine per worker, created by the first `init`; `engine-client.ts`
 *  owns the worker and terminates it on `disable()`, which is what finally
 *  releases the sessions (parakeet.js 1.4.4 has no `release()`). */
import { createLocalAsrEngine, type LocalAsrEngine } from './engine-factory';
import { setQuietAsrConsoleDebug } from './quiet-console';
import type { EngineWorkerIn, EngineWorkerOut } from './engine-protocol';
import type { BrowserASREvents, BrowserRecognizeResult, BrowserTranscribeResult } from './types';

let engine: LocalAsrEngine | null = null;

function post(message: EngineWorkerOut): void {
  postMessage(message);
}

const events: BrowserASREvents = {
  onSegment: (segment) => post({ type: 'segment', segment }),
  onLanguage: (language) => post({ type: 'language', language }),
  onStatusChange: (status) => post({ type: 'status', status, ready: engine?.isReady ?? false }),
  onError: (message) => post({ type: 'error', message }),
  onLoadProgress: (progress) => post({ type: 'loadProgress', progress }),
};

async function run(msg: Extract<EngineWorkerIn, { type: 'call' }>): Promise<void> {
  const { callId } = msg;
  try {
    if (!engine) throw new Error('The speech model worker was not initialised');
    let value: BrowserTranscribeResult | BrowserRecognizeResult | undefined;
    switch (msg.method) {
      case 'ensureLoaded':
        await engine.ensureLoaded();
        break;
      case 'transcribe': {
        const { audio, source, speakerLabel, isFinal } = msg.args;
        value = await engine.transcribe(audio, source, speakerLabel, isFinal);
        break;
      }
      case 'recognize':
        value = await engine.recognize(msg.args.audio);
        break;
      case 'stop':
        await engine.stop();
        break;
      case 'lockLanguage':
        engine.lockLanguage();
        break;
      case 'unlockLanguage':
        engine.unlockLanguage();
        break;
      case 'setVocabulary':
        engine.setVocabulary(msg.args);
        break;
    }
    post({ type: 'reply', callId, ok: true, value, ready: engine.isReady });
  } catch (err) {
    post({
      type: 'reply',
      callId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      ready: engine?.isReady ?? false,
    });
  }
}

self.onmessage = (event: MessageEvent<EngineWorkerIn>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    setQuietAsrConsoleDebug(msg.debug);
    engine ??= createLocalAsrEngine(msg.config, events);
  } else if (msg.type === 'call') {
    void run(msg);
  }
};

const gpu = (navigator as unknown as { gpu?: unknown }).gpu;
post({ type: 'hello', webgpu: gpu !== undefined && gpu !== null });
