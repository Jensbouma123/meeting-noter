# `src/lib/langid` — in-browser spoken language identification

Detects which language is being spoken from raw audio, entirely client-side.
Built because Parakeet TDT 0.6B v3 (`src/lib/asr/browser`) has no language
detection of its own — `parakeet.js`'s `LANGUAGE_NAMES`/`supportsLanguage`
helpers are static per-model metadata, not per-utterance inference, and the
engine's `BrowserASREngine` currently hardcodes `language: 'nl'`
(`src/lib/asr/browser/types.ts`) with `onLanguage` always reporting that fixed
value (`src/lib/asr/browser/parakeet.ts`).

## Approach

Whisper's own `detect_language()` (used by every Whisper client) works by
forwarding the encoder once, then running the decoder for a single step with
only the `<|startoftranscript|>` token and reading the logits at the 99
language-token positions — the un-fine-tuned multilingual Whisper checkpoint
is already a language identifier, no separate classifier head needed. That
lets this package reuse the smallest Whisper ONNX export available
(`Xenova/whisper-tiny`) instead of adding a second, unrelated model family
(VoxLingua107/ECAPA, MMS-LID) just for language ID:

- `onnx/encoder_model_quantized.onnx` (~10 MB)
- `onnx/decoder_model_quantized.onnx` (~30 MB, no-KV-cache variant — LID never
  needs more than one decoder step, so there's nothing to cache)

Total download ≈ 40 MB, comfortably within Safari's WASM linear-memory limits
(contrast with the ~650 MB–2.5 GB Parakeet encoder variants this app already
has to route around — see `model-manifest.ts`'s comments).

Mel-spectrogram feature extraction (`mel.ts`) is a from-scratch, dependency-
free reimplementation of `whisper.audio.log_mel_spectrogram` — no FFT library,
no `@huggingface/transformers`. `n_fft=400` isn't a power of two, so frames
are transformed with a precomputed cos/sin table (direct DFT) rather than a
mixed-radix FFT; fast enough given this only runs periodically (every ~20s of
new audio) in a Web Worker, never per-frame in real time.

Model weights download through
`src/lib/asr/browser/resumable-download.ts`'s `downloadHfFileResumable()` —
imported directly (not re-exported from `src/lib/asr/browser/index.ts`), so
the same resumable/cached/cross-tab-coordinated download path Parakeet uses
also covers this ~40 MB model, without adding a second ad-hoc fetch path.

WebGPU execution provider is tried first, WASM is the fallback if session
creation fails — same reasoning as `backend-detect.ts`: a WebGPU-capable
`navigator` doesn't guarantee a working session.

All detectors share **one** worker, and therefore one set of ONNX sessions, for
the life of the page (released when the last detector is disposed). This used to
be one worker per detector, i.e. one complete copy of this ~40 MB model per
capture source — pure duplication, and one of the allocations that killed a
Safari WebContent process on Record (see `src/lib/asr/browser/parakeet.ts` for
the same reasoning applied to the much larger speech model). The `blob:` URLs
the sessions are created from are released as soon as the sessions exist, for
the same reason.

## API

```ts
import { createLanguageDetector, type LanguageResult } from '@/lib/langid';

const detector = createLanguageDetector();

const unsubscribe = detector.onLanguage(({ code, name, confidence }: LanguageResult) => {
  // code: ISO 639-1 (Whisper's 99-language set), name: display name, confidence: 0-1
});
detector.onError((message) => console.warn('[langid]', message));

// Feed mono 16kHz PCM as it arrives from the mic/system audio pipeline —
// buffering and detection scheduling happen inside the worker.
detector.push(pcm16kFloat32Array);

// ...
unsubscribe();
detector.dispose();
```

`push()` can be called with whatever chunk size is already on hand; the first
detection fires once ~5s of audio has accumulated, then again every ~20s of
new audio (re-detection, in case the speaker or source changes).

## Wiring into `src/lib/meeting/index.ts` (not done here — that file is owned
## by another worker; this is the snippet for whoever picks it up)

`MeetingState.language` is currently always empty and `setLanguage()` is an
intentional no-op (`src/lib/meeting/index.ts`):

```ts
setLanguage(code: string): void {
  // Intentionally empty until browser ASR supports more than one language.
}
```

Suggested wiring, one detector per audio source (mic / system):

```ts
import { createLanguageDetector } from '@/lib/langid';

// alongside the existing per-source BrowserASREngine construction
const langDetectors = new Map<'mic' | 'system', ReturnType<typeof createLanguageDetector>>();

function ensureLangDetector(source: 'mic' | 'system') {
  let detector = langDetectors.get(source);
  if (!detector) {
    detector = createLanguageDetector();
    detector.onLanguage(({ code, name, confidence }) => {
      // e.g. update MeetingState.language, gate on `locked`/confidence
      // threshold the same way BrowserASREngine's own onLanguage does
      // (see `_buildLanguageInfo` in parakeet.ts) before calling setLanguage().
    });
    langDetectors.set(source, detector);
  }
  return detector;
}

// wherever raw mic/system PCM chunks are already being read (before or
// alongside handing them to BrowserASREngine):
ensureLangDetector('mic').push(pcmChunk);

// on meeting end / source teardown:
for (const detector of langDetectors.values()) detector.dispose();
langDetectors.clear();
```

Note this package's own `LanguageResult` (`{ code, name, confidence }`) is
structurally identical to `BrowserLanguageInfo` minus `locked` — a caller that
wants to merge the two into one displayed value can add `locked` itself once
it decides to pin a detected language and stop re-checking.

## Testing

`languages.test.ts`, `mel.test.ts` and `index.test.ts` cover the parts that
don't need a browser (token-table integrity, mel feature-extraction
properties, and the worker-sharing/ID-routing contract with a stubbed
`Worker`). Model
loading/inference (`model.ts`) and the worker's buffering/scheduling
(`worker.ts`) aren't unit-tested here — they need a real `Worker` + ONNX
Runtime environment, same reasoning `src/lib/asr/browser` already applies to
its own IndexedDB/Worker-dependent code (only the pure decision logic in
`resumable-download.ts` has unit tests; the rest is exercised by running the
app).
