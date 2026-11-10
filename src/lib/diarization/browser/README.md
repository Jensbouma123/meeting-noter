# In-browser streaming speaker diarization

Standalone replacement for the Python diarization sidecar (`server/diarize.py`,
`server/realtime/*`) — runs entirely client-side via ONNX in a Web Worker, no
server round trip. Owned independently of the ASR/meeting pipeline
(`src/lib/asr/**`, `src/lib/meeting/**`); this module only decides **who
spoke when**, never **what was said**.

## Model

NVIDIA **Nemotron-3-Diarization** (Streaming Sortformer: 31-layer Transformer
encoder with RoPE, 100M params, up to 8 speakers ordered by first arrival),
ONNX export `onnx-community/Nemotron-3-Diarization-ONNX`, q4f16 variant:

| File | Size |
|---|---|
| `onnx/model_q4f16.onnx` | 408,120 bytes |
| `onnx/model_q4f16.onnx_data` | 73,076,608 bytes |

The same file set serves WebGPU and the WASM fallback (see `manifest.ts`).
License: **OpenMDW-1.1** (https://openmdw.ai/license/1-1/).

Files are downloaded through the ASR module's resumable Hugging Face
downloader (`src/lib/asr/browser/resumable-download.ts`, import only — see
`downloader.ts`): Range-request resume across a refresh, cross-tab dedup, and
size/hash validation before anything is cached.

## Algorithm

The ONNX graph is stateless: `input_features` (log-mel) + `cached_embeds` in,
`logits` + `chunk_embeds` + `silence_embeds` out. Everything that makes it
*streaming* runs here:

1. **Features** (`mel.ts`): 128-bin log-mel at 10 ms, matching the model's
   `NemotronAsrStreamingFeatureExtractor` (pre-emphasis, 400-tap Hann in a
   512 FFT, Slaney mel, `log(x + 2^-24)`) as one centered pass over the whole
   recording, computed incrementally.
2. **Chunking** (`core.ts`): once `chunkLength + rightContext` encoder frames
   (80 ms each) are buffered, they run through the model with the speaker
   cache + FIFO frames. The chunk's logits are the output; the look-ahead
   frames open the next chunk.
3. **Speaker cache** (`speaker-cache.ts`): a port of transformers'
   `Nemotron3DiarizationSpeakerCache` (NeMo `SortformerModules.streaming_update`
   / `_compress_spkcache`). Chunk frames enter a FIFO; overflow moves the oldest
   frames to the Arrival-Order Speaker Cache; when that overflows it is
   compressed to the 264 frames that most confidently hold one speaker each,
   grouped by speaker, plus a learned silence frame per speaker. This is what
   keeps speaker 2 "speaker 2" for the whole meeting.
4. **Turns** (`turns.ts`): each of the 8 channels is thresholded on its own,
   with hysteresis: on above 0.55 (above 0.4 while another channel is on), off
   below 0.1 (so the quieter of two overlapping speakers is not dropped when
   their probability sags); a run closes after 1.1 s off, runs under 0.2 s are dropped, and a run open
   for 8 s is emitted and continues as a new turn. Overlapping speech gives
   overlapping turns. The worker also reports every open run after each step
   (`final: false`, same `id` as the closing report), so the speaker is known
   while they are still talking rather than after they stop.
5. Channel `k` becomes `${source}:${k}` — the speaker-id shape
   `src/lib/meeting/store.ts` already parses.

Streaming modes (`core.ts`): `DEFAULT_MODE` is 4 s chunks + 0.64 s look-ahead
with a 188-frame FIFO, used on WASM; `REALTIME_MODE` is the same with 2 s
chunks, used on WebGPU (DER 37.2% vs 35.2%, WASM RTF 1.0 so not there);
`LOW_LATENCY_MODE` is the model card's 0.72 s chunks.
A step's cost is dominated by the ~450–540 cached frames it attends to, not
the chunk, so bigger chunks are what let the WASM fallback keep up. DER and
speed per mode: exchange/nemotron-browser-diarization.md.

## API

```ts
import { createDiarizer } from '@/lib/diarization/browser';

const diarizer = createDiarizer({ source: 'mic' }); // or 'system'

const unsubscribe = diarizer.onSpeakerTurn((turn) => {
  // turn: { speaker: 'mic:0', source: 'mic', start: 12.34, end: 15.67, id: 'mic#3', final: true }
  // final: false = still open; a later turn with the same id replaces it.
});
diarizer.onReady(({ backend }) => {}); // model loaded: 'webgpu' | 'wasm'
diarizer.onError((message, code) => {}); // code 'not-cached': files not on disk

diarizer.push(float32Chunk, startSample); // 16 kHz mono in [-1, 1], capture-clock position
await diarizer.flush(); // scores the tail and closes open turns
diarizer.dispose();
```

Every diarizer shares one worker, so the model is loaded once no matter how
many sources are diarized; the worker is terminated when the **last**
diarizer is disposed, so the session is returned between recordings.

`push()` transfers the chunk's `ArrayBuffer` to the worker — don't reuse the
`Float32Array` after calling it. Audio pushed while the model loads is held
(newest 30 s) and replayed once it is ready. With `localStorage['asr-debug'] = '1'`
the worker logs each step's inference time and the bridge each turn's lag. Turns are reported in seconds on the
caller's capture clock (the first `startSample` fixes the origin).

## Files

- `types.ts` — public types (`Diarizer`, `SpeakerTurn`, `DiarizerOptions`).
- `manifest.ts` — model repo/files/sizes and model constants.
- `mel.ts` / `fft.ts` — the log-mel frontend.
- `speaker-cache.ts` — FIFO + AOSC bookkeeping.
- `turns.ts` — per-frame probabilities → closed turns.
- `core.ts` — `DiarizerCore`: chunk scheduling for one source (model
  injected, unit-tested without ONNX Runtime).
- `sortformer-model.ts` — ONNX wrapper; `onnx-session.ts` — WebGPU→WASM
  session creation with external data.
- `downloader.ts` — model download via the ASR module's resumable downloader.
- `worker.ts` — Web Worker entry point; `index.ts` — `createDiarizer()`.

## Testing

- `mel.test.ts` — filterbank and features against transformers/librosa
  reference values; chunking invariance.
- `speaker-cache.test.ts` — FIFO overflow, cache moves, probability
  re-estimation vs stored probabilities, compression (per-speaker selection,
  order, silence slots, newest-frame boost), frame scores.
- `turns.test.ts` — gap bridging, blips, overlap, hysteresis, long-run splitting.
- `core.test.ts` — chunk/look-ahead scheduling, features at the cursor,
  turn timing on the capture clock, flush/dispose.
- `index.test.ts` — worker sharing and release.
- `scripts/diarization-der.mjs` — DER and overlap recall/precision on a
  real meeting clip through onnxruntime-web WASM in Node, old vs new
  pipeline; `--impl probs` scores another implementation's probabilities
  through the same turn postprocessing.
- `scripts/diarization-dump-probs.mjs` / `scripts/diarization-nemo-reference.py`
  — per-frame probabilities and log-mel from this pipeline and from NVIDIA
  NeMo's own streaming run, for parity checks.

The streaming numerics were checked against transformers' PyTorch
implementation on the fp32 graph (max probability difference < 1e-4 over
120 s, through cache compression), and against NeMo's `forward_streaming`
on the 5-min AMI clip: fp32 graph and NeMo on the same log-mel differ by at
most 5e-5 and score the same DER. NeMo's `.nemo` keeps its window and
filterbank in bfloat16, so its own log-mel is off by up to 0.6 in the lowest
bins; that moves DER by 0.2 pt. The int4 weights (`q4f16`, and `q4` alike)
move probabilities by up to 0.6 (mean 0.008) and did not score worse than
fp32 (exchange/sortformer-parity.md). Not covered here: WebGPU execution
(needs a browser).
