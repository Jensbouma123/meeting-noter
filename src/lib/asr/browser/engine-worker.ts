import { createLocalAsrEngine } from './engine-factory';
import type { LocalAsrEngine } from './types';
import { setQuietAsrConsoleDebug } from './quiet-console';
import type { EngineWorkerIn, EngineWorkerOut } from './types/engine-protocol';
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

async function executeEngineCall(msg: Extract<EngineWorkerIn, { type: 'call' }>): Promise<void> {
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
      case 'setLanguageHint':
        engine.setLanguageHint(msg.args.code);
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
    void executeEngineCall(msg);
  }
};

const gpu = (navigator as unknown as { gpu?: unknown }).gpu;
post({ type: 'hello', webgpu: gpu !== undefined && gpu !== null });
