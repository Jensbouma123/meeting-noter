/** ASR model manifest — the single source of truth for what gets downloaded.
 *
 * The repo id, the quantisation and the file list used to be duplicated across
 * `types.ts`, `model-registry.ts` and `browser-asr-download-manager.ts`. They
 * drifted, and the drift is what produced a bare `404` on
 * `encoder-model.onnx`: the registry pointed at a repo shipping only
 * `encoder-model.int4.onnx` while `parakeet.js` can only address
 * `.int8` / `.fp16` / `.onnx` (see `QUANT_SUFFIX` in parakeet.js `hub.js`).
 *
 * QUANTISATION IS NOT FREE CHOICE — but only inside `parakeet.js`'s own hub
 * loader. `getParakeetModel` force-upgrades the encoder whenever the backend
 * starts with `webgpu`:
 *
 *     if (backend.startsWith('webgpu') && encoderQ === 'int8') encoderQ = 'fp32';
 *
 * This app never calls that loader: it resolves the files itself (see
 * `resumable-download.ts`) and hands them to `ParakeetModel.fromUrls`, which
 * takes whatever encoder URL it is given — no force-upgrade. `encoderQuant`
 * is stated explicitly below to keep each variant honest about what it fetches.
 *
 * BACKEND CHOICE IS A MEMORY CHOICE, AND THE WEBGPU ENCODER IS A SPEED
 * CHOICE. The WebGPU variant is now the q4f16 encoder
 * (`encoder-model.q4f16.onnx`, 516 MB, single file, no external `.data`) —
 * self-built with `scripts/convert-parakeet-v3.py` like the fp16 one, because
 * upstream ships neither. Safari takes this variant (see `backend-detect.ts`):
 * the 2.44 GB fp32 encoder that used to kill the WebContent process is gone
 * from this path entirely, and unlike int8 the quantised ops have WebGPU
 * kernels — the decoder is unaffected: it runs on WASM in every WebGPU mode,
 * so `decoderQuant: 'int8'` is both legal and ~4x smaller.
 *
 * WHY q4f16 AND NOT fp16 (Safari 27.0, arm64, AMI EN2002b first 5 min, 300 s
 * 16 kHz mono — `asr-bench-results.md` §3; the 140-segment reference joins
 * overlapped turns a single-channel decoder cannot reproduce, so only the
 * ranking is meaningful, not the absolute WER):
 *
 *   | encoder      |  size  | load (s) | RTF    | WER   |
 *   |--------------|--------|----------|--------|-------|
 *   | q4f16 (516M) |  0.50G |      5.28| **0.069** | **0.478** |
 *   | fp16  (1.2G) |  1.15G |      4.23| 0.107 | 0.499 |
 *   | int8  (652M) |  0.62G |     27.98| 1.412 | 0.623 |
 *
 * q4f16 is both the fastest (1.55x over fp16) and the most accurate, at 42% of
 * fp16's bytes — so the default is q4f16 and fp16 is the rung below it. The
 * same encoder on the onnxruntime CPU baseline (§1) scores 0.468 WER at RTF
 * 0.042, so this is the encoder, not a Safari quirk.
 *
 * WHY int8 IS NOT A LIVE BACKEND: RTF 1.41 means the CPU model needs 1.41 s
 * per second of audio. It cannot transcribe while the meeting is running, so
 * it is only ever used to transcribe a finished recording (see
 * `post-stop-transcription.ts` and `browser-asr.ts`).
 */

import type { FromHubOptions } from 'parakeet.js';
import type { AsrModelFamily } from './model-family';

/**
 * The manifest's runtime options, derived from the shape `parakeet.js`'s
 * `FromHubOptions` has — kept as a type-only reference because the app
 * resolves and loads the files itself (see `resumable-download.ts`), and the
 * options are the same set either way.
 */
type HubOptions = NonNullable<FromHubOptions>;

/**
 * Encoder quantisations this app can use.
 *
 * `parakeet.js`'s own union is `'int8' | 'fp32' | 'fp16'` — its hub loader
 * addresses upstream files by suffix, and upstream ships no `q4f16`. That
 * loader is never called here (see this file's header): the app resolves its
 * own files and hands them to `ParakeetModel.fromUrls`, which takes whatever
 * encoder URL it is given. The only consumer of this value is bookkeeping —
 * `hubOptionsFor()`'s record of what a variant is, and the bench page's
 * variant label — so widening the union is free of runtime consequence and
 * buys the q4f16 default its honest name.
 */
type EncoderQuant = NonNullable<HubOptions['encoderQuant']> | 'q4f16' | 'int4';
type DecoderQuant = NonNullable<HubOptions['decoderQuant']>;

/** The two encoder quantisations that run on WebGPU, best first. */
export type WebgpuEncoderQuant = Extract<EncoderQuant, 'q4f16' | 'fp16'>;

export type { EncoderQuant };

/**
 * The two backends this app actually chooses between. `parakeet.js`'s own
 * `BackendMode` has four values (`webgpu` / `webgpu-hybrid` / `webgpu-strict` /
 * `wasm`) but the first three all mean "run the encoder on WebGPU" with
 * different fallback strictness — for the purpose of *which model files to
 * fetch* there are only two cases: WebGPU (the self-built q4f16 encoder, or
 * the fp16 one behind it) or WASM-only (wasm32's linear memory limit in some
 * engines, and RTF 1.41 on any CPU — see the header).
 */
export type AsrBackend = 'webgpu' | 'wasm';

export interface AsrModelManifest {
  /**
   * Which engine loads these files: `parakeet.ts` (`parakeet.js`, TDT) or
   * `nemotron.ts` (cache-aware streaming RNNT). See `model-family.ts`.
   */
  engine: AsrModelFamily;
  /** Registry key — also the localStorage identity of the entry. Shared by
   *  every backend variant of a given model: it identifies "the speech
   *  model", not "the speech model for backend X". */
  key: string;
  /**
   * This variant's identity, as the bench names it: `webgpu-q4f16`,
   * `webgpu-fp16`, `wasm-int8`.
   *
   * Load-bearing in two places. The bench chain and the result sink use it to
   * name a run after the encoder that actually loaded (a run whose URL asked
   * for `encoder=q4f16` and got the fp16 file back must not be filed as
   * `webgpu-fp16` — that mislabel is a §3 table that silently compares the
   * same file against itself). And the registry compares it when deciding
   * whether a persisted entry still describes the variant in play, because two
   * WebGPU variants share one `modelRepo` and one `backend` and differ only in
   * their encoder — a 516 MB download must never be treated as a resumable
   * part of a 1.24 GB one.
   */
  variant: string;
  /** HuggingFace repo id the files are fetched from. */
  modelRepo: string;
  displayName: string;
  description: string;
  /** Which of the two cases above this manifest is for. */
  asrBackend: AsrBackend;
  backend: NonNullable<HubOptions['backend']>;
  encoderQuant: EncoderQuant;
  decoderQuant: DecoderQuant;
  /**
   * `js` computes the mel spectrogram in JavaScript, which skips downloading
   * `nemo128.onnx` (~140 KB) and avoids a third ONNX session.
   */
  preprocessorBackend: NonNullable<HubOptions['preprocessorBackend']>;
  /**
   * Every file `parakeet.js` will actually fetch, in download order.
   */
  files: readonly string[];
  /**
   * Per-file download URL overrides. A file listed here is fetched from the
   * override URL instead of the Hugging Face repo — for files no public repo
   * ships in `parakeet.js` layout (the self-built fp16 encoder). The cache
   * key stays `(modelRepo, revision, filename)`, so caching, resume, probing
   * and validation behave exactly as for hosted files; only the origin
   * differs. Absent = fetch from `modelRepo` on Hugging Face.
   */
  fileUrlOverrides?: Readonly<Record<string, string>>;
  /**
   * Byte size of every file above, keyed by filename.
   *
   * Exists so `fallbackSizeBytes` is a *sum* rather than a second hand-typed
   * number that can disagree with the files it describes. It is what the
   * download consent dialog, the progress bar and the delete row all quote
   * before (and instead of) the live `probeModelSize` measurement, so a stale
   * total is a wrong number in front of the user about how big the download is.
   */
  fileSizes: Readonly<Record<string, number>>;
  /**
   * Byte total measured from the HuggingFace tree API, used until the runtime
   * probe (`probeModelSize`) confirms it. Keep this honest: it is shown to the
   * user as "this is how big the download is" before they consent.
   */
  fallbackSizeBytes: number;
}

/**
 * Where the WebGPU variants' encoders download from.
 *
 * The upstream repo ships no fp16 and no q4f16 encoder, so these point at
 * hosting outside Hugging Face: `scripts/convert-parakeet-v3.py` builds the
 * files (see `webgpu-int8-spike.md` in the exchange dir for sizes and
 * validation), and whoever publishes them sets the matching env var. Until
 * then they resolve to the dev-served conversion output (`public/models/…`,
 * gitignored — `next dev` serves it same-origin, and the resumable
 * downloader's resume/Range logic applies to it like any other origin).
 *
 * Nothing here is committed: the q4f16 encoder is 516 MB of weights this
 * repository does not and should not carry.
 */
export const FP16_ENCODER_URL =
  process.env.NEXT_PUBLIC_FP16_ENCODER_URL ??
  '/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.fp16.onnx';

export const Q4F16_ENCODER_URL =
  process.env.NEXT_PUBLIC_Q4F16_ENCODER_URL ??
  '/models/parakeet-tdt-0.6b-v3-webgpu/encoder-model.q4f16.onnx';

/**
 * Whether the self-built WebGPU encoders can actually be fetched.
 *
 * They are served from nowhere by default: the `/models/…` fallbacks above are
 * gitignored conversion output that only `next dev` serves. So an encoder is
 * offered only when its `NEXT_PUBLIC_*_ENCODER_URL` is set (someone hosts the
 * file) or the build is not a production one (dev serves `public/models`).
 * Without this, a hosted build offered q4f16 and the user got a dead
 * "file wasn't found" card. Read once at module load — the env is inlined at
 * build time, so it cannot change at runtime.
 */
function encoderAvailable(envUrl: string | undefined): boolean {
  return (envUrl !== undefined && envUrl !== '') || process.env.NODE_ENV !== 'production';
}

/** Sizes of the two files every Parakeet variant shares, as the HF tree
 *  reports them. Kept in one place so no variant can quote a total that omits
 *  or re-spells them. */
const DECODER_INT8_BYTES = 18_202_004;
const VOCAB_BYTES = 93_939;

/** Parakeet TDT 0.6B v3 — WebGPU variant, q4f16 encoder. THE DEFAULT.
 *
 * `encoder-model.q4f16.onnx` (516 MB, single file, no external `.data`),
 * self-built — see `Q4F16_ENCODER_URL` above. The default on every engine with
 * a working WebGPU adapter, Safari included, because on the §3 bench it is
 * simultaneously the fastest (RTF 0.069 vs fp16's 0.107) and the most
 * accurate (WER 0.478 vs 0.499) while being 42% of fp16's bytes — see the
 * header for the whole table.
 *
 * If this variant's session fails to create at runtime anyway (driver
 * denylist, context loss, out of GPU memory — none of which
 * `detectAsrBackend()` can see), `browser-asr.ts` walks the fallback order in
 * `webgpuEncoderFallbacks` and then to WASM/int8; the crash-loop guard is
 * unchanged.
 */
export const PARAKEET_TDT_V3_WEBGPU: AsrModelManifest = Object.freeze({
  engine: 'parakeet',
  key: 'parakeet-ttd',
  variant: 'webgpu-q4f16',
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  displayName: 'Parakeet TDT 0.6B v3',
  description:
    'Browser-native speech recognition, run entirely on your device with WebGPU. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'webgpu',
  backend: 'webgpu-hybrid',
  // q4f16: the sub-fp32 quantisation with WebGPU kernels that is also the
  // fastest and the most accurate of the ones this app can fetch (header).
  encoderQuant: 'q4f16',
  // The decoder runs on WASM in WebGPU modes, where int8 is supported.
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  files: [
    'encoder-model.q4f16.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileUrlOverrides: Object.freeze({
    'encoder-model.q4f16.onnx': Q4F16_ENCODER_URL,
  }),
  fileSizes: Object.freeze({
    // Built 2026-09-28, scripts/convert-parakeet-v3.py.
    'encoder-model.q4f16.onnx': 515_756_810,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 515_756_810 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

/**
 * Parakeet TDT 0.6B v3 — WebGPU variant, fp16 encoder. THE FALLBACK.
 *
 * The rung below q4f16 in `webgpuEncoderFallbacks`, and the only one that is
 * reached when a q4f16 session fails to create. It is 1.24 GB — 2.4x the
 * default's download — for a bench RTF 0.107 and WER 0.499 against q4f16's
 * 0.069/0.478, so it is never chosen while q4f16 works; it is kept because it
 * is a *different* encoder graph, and a driver that cannot run a 4-bit
 * MatMul can still run fp16.
 *
 * Chrome is the reason this rung exists in practice: §2 of the bench results
 * could not run Chrome WebGPU at all (the sandbox could not create the unix
 * sockets every Chromium needs), so q4f16 on Chrome is unverified. Rather than
 * guess, Chrome gets the same default with this rung one runtime failure away.
 */
export const PARAKEET_TDT_V3_WEBGPU_FP16: AsrModelManifest = Object.freeze({
  ...PARAKEET_TDT_V3_WEBGPU,
  variant: 'webgpu-fp16',
  encoderQuant: 'fp16',
  files: [
    'encoder-model.fp16.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileUrlOverrides: Object.freeze({
    'encoder-model.fp16.onnx': FP16_ENCODER_URL,
  }),
  fileSizes: Object.freeze({
    'encoder-model.fp16.onnx': 1_239_245_959,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 1_239_245_959 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

/**
 * Parakeet TDT 0.6B v3 — WASM (CPU-only) variant.
 *
 * The last rung of the fallback order, and the only one on a device with no
 * usable WebGPU. The fp32 encoder's 2.44 GB external-data blob does not fit in
 * a wasm32 linear memory in every browser ("WebAssembly.Memory initial page
 * count is too large" — the bug this manifest exists to fix): wasm32's
 * addressable space tops out at 4 GB, and in practice engines refuse well
 * before that. `encoder-model.int8.onnx` is a single self-contained file
 * (no external `.data`) at 652 MB, comfortably within that limit.
 *
 * There is no fp16 or q4f16 encoder in this repo, and no int4 variant either —
 * int8 is the only quantisation below fp32 that this repo actually ships
 * (verified against the live HF tree, see `model-manifest.test.ts`).
 *
 * It is NOT a live backend. §3 of the bench results measures this exact file at
 * RTF 1.41 — 1.41 s of CPU per second of audio, and the worst WER of the three
 * (0.623). A recording therefore cannot be transcribed while it is being
 * captured on this variant: `browser-asr.ts` buffers the audio and transcribes
 * it after Stop instead (see `post-stop-transcription.ts`).
 */
export const PARAKEET_TDT_V3_WASM: AsrModelManifest = Object.freeze({
  engine: 'parakeet',
  key: 'parakeet-ttd',
  variant: 'wasm-int8',
  modelRepo: 'istupakov/parakeet-tdt-0.6b-v3-onnx',
  displayName: 'Parakeet TDT 0.6B v3 (CPU)',
  description:
    'Browser-native speech recognition, run entirely on your device’s CPU. Used when your ' +
    'browser cannot run the GPU-accelerated version. It is too slow to transcribe while you ' +
    'talk, so your recording is transcribed after you stop it. Downloaded once and cached in ' +
    'your browser — audio never leaves this machine.',
  asrBackend: 'wasm',
  backend: 'wasm',
  encoderQuant: 'int8',
  decoderQuant: 'int8',
  preprocessorBackend: 'js',
  files: [
    'encoder-model.int8.onnx',
    'decoder_joint-model.int8.onnx',
    'vocab.txt',
  ],
  fileSizes: Object.freeze({
    'encoder-model.int8.onnx': 652_183_999,
    'decoder_joint-model.int8.onnx': DECODER_INT8_BYTES,
    'vocab.txt': VOCAB_BYTES,
  }),
  fallbackSizeBytes: 652_183_999 + DECODER_INT8_BYTES + VOCAB_BYTES,
});

/** Byte sizes from the HF tree of `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4`
 *  (revision 8364d9e, 2026-06-08). */
const NEMOTRON_FILE_SIZES: Readonly<Record<string, number>> = Object.freeze({
  'encoder.onnx': 2_677_548,
  'encoder.onnx.data': 690_089_984,
  'decoder.onnx': 4_696,
  'decoder.onnx.data': 59_785_216,
  'joint.onnx': 2_136,
  'joint.onnx.data': 37_830_656,
  'vocab.txt': 64_024,
});

/**
 * Nemotron 3.5 ASR streaming 0.6B, int4 — WebGPU variant.
 *
 * A cache-aware FastConformer-RNNT exported for 560 ms chunks: encoder
 * `MatMulNBits` (4-bit, block 32) with fp32 activations, fp32 LSTM decoder
 * and joint, 40 locales with punctuation. MIT per the repo card (base model
 * under the NVIDIA Open Model License). The encoder runs on WebGPU, the
 * decoder and joint on WASM, like Parakeet's hybrid mode.
 *
 * Same key as Parakeet: the registry holds one "speech model" entry, and a
 * different `modelRepo` re-registers it (see `registerModel`), so switching
 * family asks for consent to exactly the files that are about to arrive.
 */
export const NEMOTRON_ASR_WEBGPU: AsrModelManifest = Object.freeze({
  engine: 'nemotron',
  key: 'parakeet-ttd',
  variant: 'nemotron-webgpu-int4',
  modelRepo: 'onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4',
  displayName: 'Nemotron 3.5 ASR Streaming 0.6B',
  description:
    'Streaming speech recognition, run entirely on your device with WebGPU. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'webgpu',
  backend: 'webgpu-hybrid',
  encoderQuant: 'int4',
  decoderQuant: 'fp32',
  preprocessorBackend: 'js',
  files: Object.keys(NEMOTRON_FILE_SIZES),
  fileSizes: NEMOTRON_FILE_SIZES,
  fallbackSizeBytes: Object.values(NEMOTRON_FILE_SIZES).reduce((a, b) => a + b, 0),
});

/** Nemotron on WASM only — the same files, so no second download. */
export const NEMOTRON_ASR_WASM: AsrModelManifest = Object.freeze({
  ...NEMOTRON_ASR_WEBGPU,
  variant: 'nemotron-wasm-int4',
  displayName: 'Nemotron 3.5 ASR Streaming 0.6B (CPU)',
  description:
    'Streaming speech recognition, run entirely on your device’s CPU. Used when your browser ' +
    'cannot run the GPU-accelerated version; your recording is transcribed after you stop it. ' +
    'Downloaded once and cached in your browser — audio never leaves this machine.',
  asrBackend: 'wasm',
  backend: 'wasm',
});

/** The manifest for a family on a backend — the first attempt on it. */
export function manifestForFamily(family: AsrModelFamily, backend: AsrBackend): AsrModelManifest {
  if (family === 'nemotron') return backend === 'webgpu' ? NEMOTRON_ASR_WEBGPU : NEMOTRON_ASR_WASM;
  return manifestForBackend(backend);
}

/**
 * The WebGPU encoders this app can fetch, best first — the fallback order.
 *
 * A real order, not a set: `q4f16` is measurably the fastest and the most
 * accurate of the two (§3 in the header) and 42% of the bytes, so it is what
 * every device gets. `fp16` is what a device that cannot create a q4f16
 * session gets instead, and it is a genuinely different graph rather than a
 * re-quantisation hint — which is the only reason to keep 1.24 GB around.
 */
export const WEBGPU_ENCODER_FALLBACKS: readonly WebgpuEncoderQuant[] = Object.freeze(
  (
    [
      ['q4f16', process.env.NEXT_PUBLIC_Q4F16_ENCODER_URL],
      ['fp16', process.env.NEXT_PUBLIC_FP16_ENCODER_URL],
    ] as const
  )
    .filter(([, url]) => encoderAvailable(url))
    .map(([quant]) => quant),
);

/** Whether any WebGPU encoder is hosted — when not (the upstream repo ships only
 *  fp32 at 2.4 GB and int8, which has no WebGPU kernels), the CPU variant is
 *  the default and the only one offered. */
export function webgpuEncodersAvailable(): boolean {
  return WEBGPU_ENCODER_FALLBACKS.length > 0;
}

/** The WebGPU manifest for one rung of `WEBGPU_ENCODER_FALLBACKS`. */
export function webgpuManifestForEncoder(encoder: WebgpuEncoderQuant): AsrModelManifest {
  return encoder === 'fp16' ? PARAKEET_TDT_V3_WEBGPU_FP16 : PARAKEET_TDT_V3_WEBGPU;
}

/** The rung *after* `encoder`, or `null` when this was the last one. */
export function nextWebgpuEncoder(encoder: WebgpuEncoderQuant): WebgpuEncoderQuant | null {
  const next = WEBGPU_ENCODER_FALLBACKS[WEBGPU_ENCODER_FALLBACKS.indexOf(encoder) + 1];
  return next ?? null;
}

/**
 * Which rung of `WEBGPU_ENCODER_FALLBACKS` a manifest is, or `null` when it is
 * not a WebGPU variant at all.
 *
 * The narrowing the fallback walk needs: a load failure only moves the chain
 * forward when the manifest that failed was a WebGPU one, and a WASM manifest
 * failing is a real, unrecoverable error rather than a reason to try a smaller
 * encoder.
 */
export function webgpuEncoderOf(manifest: AsrModelManifest): WebgpuEncoderQuant | null {
  if (manifest.asrBackend !== 'webgpu') return null;
  return manifest.encoderQuant === 'fp16' ? 'fp16' : 'q4f16';
}

/**
 * Every manifest the app can try, in the order it will try them: the WebGPU
 * rungs first, then the CPU variant.
 *
 * The whole fallback policy is this list, walked in order by
 * `browser-asr.ts` when a session fails to create. Exported (rather than
 * re-derived at each call site) so the order is stated once and can be pinned
 * by a test: a chain that silently skipped fp16 would look like a working
 * chain on Safari and only fail on the device that needed it.
 */
export function asrManifestFallbackOrder(): readonly AsrModelManifest[] {
  return Object.freeze([
    ...WEBGPU_ENCODER_FALLBACKS.map(webgpuManifestForEncoder),
    PARAKEET_TDT_V3_WASM,
  ]);
}

/** Pick the manifest for a given backend — the single place that decision is
 *  made, for the *first* attempt on that backend (see
 *  `asrManifestFallbackOrder` for what happens after a failure). */
export function manifestForBackend(backend: AsrBackend): AsrModelManifest {
  return backend === 'webgpu' ? webgpuManifestForEncoder(WEBGPU_ENCODER_FALLBACKS[0] ?? 'q4f16') : PARAKEET_TDT_V3_WASM;
}

/** Every manifest this app ships, for looking one up by its `variant`. */
function allManifests(): readonly AsrModelManifest[] {
  return [
    PARAKEET_TDT_V3_WEBGPU,
    PARAKEET_TDT_V3_WEBGPU_FP16,
    PARAKEET_TDT_V3_WASM,
    NEMOTRON_ASR_WEBGPU,
    NEMOTRON_ASR_WASM,
  ];
}

/** The manifest a registry entry was registered from, by its `variant`. */
export function manifestForVariant(variant: string | undefined): AsrModelManifest | null {
  return allManifests().find((m) => m.variant === variant) ?? null;
}

/**
 * @deprecated Kept only because `modelRepo` is identical across backend
 * variants and a couple of call sites just need "the repo", not "the
 * manifest for the active backend". Prefer `manifestForBackend`.
 */
export const PARAKEET_TDT_V3 = PARAKEET_TDT_V3_WEBGPU;

/**
 * A manifest's runtime options — the part of it that describes *how* to run
 * the model rather than *what* to download.
 *
 * What a registry entry carries as `fromHubOptions` (a name that predates the
 * app resolving the files itself, and is kept so persisted registry state
 * keeps parsing).
 */
export type ManifestRuntimeOptions = Pick<
  AsrModelManifest,
  'backend' | 'encoderQuant' | 'decoderQuant' | 'preprocessorBackend'
>;

/** A manifest's runtime options (quantisation, backend, preprocessor). */
export function hubOptionsFor(manifest: AsrModelManifest): ManifestRuntimeOptions {
  return {
    backend: manifest.backend,
    encoderQuant: manifest.encoderQuant,
    decoderQuant: manifest.decoderQuant,
    preprocessorBackend: manifest.preprocessorBackend,
  };
}

/** HuggingFace tree API for a repo, with the revision pinned. */
function treeUrl(modelRepo: string, revision = 'main'): string {
  const encoded = modelRepo.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/api/models/${encoded}/tree/${encodeURIComponent(revision)}?recursive=1`;
}

/**
 * Sum the real byte size of the files a manifest will fetch, straight from
 * the HuggingFace tree API.
 *
 * Files with a `fileUrlOverrides` entry are measured with a `HEAD` against
 * the override URL instead — the HF tree knows nothing about them, and
 * treating "absent from the tree" as failure would make the probe lie about
 * every manifest that hosts a file itself.
 *
 * This exists because the download total is shown to the user *before* they
 * consent, and a hardcoded guess is not good enough for a multi-gigabyte
 * download. Returns `null` on any failure so callers can fall back to
 * `fallbackSizeBytes` rather than blocking the dialog.
 */
export async function probeModelSize(
  manifest: AsrModelManifest,
  signal?: AbortSignal,
): Promise<number | null> {
  try {
    const treeSizes = await treeSizesFor(manifest.modelRepo, signal);
    let total = 0;
    for (const file of manifest.files) {
      const override = manifest.fileUrlOverrides?.[file];
      if (override !== undefined) {
        const size = await headContentLength(override, signal);
        // A hosted file that cannot be measured is a real problem, but it
        // surfaces as a download error later — don't mask it here by
        // returning a confidently wrong total.
        if (size === null) return null;
        total += size;
        continue;
      }
      if (treeSizes === null) return null;
      // A file the manifest expects but the repo lacks is a real problem, but
      // it surfaces as a download error later — don't mask it here by
      // returning a confidently wrong total.
      if (!treeSizes.has(file)) return null;
      total += treeSizes.get(file) as number;
    }
    return total;
  } catch {
    return null;
  }
}

/** Filename → byte size from the HuggingFace tree API, or `null` when the
 *  listing itself is unavailable (network/API failure). */
async function treeSizesFor(modelRepo: string, signal?: AbortSignal): Promise<Map<string, number> | null> {
  const res = await fetch(treeUrl(modelRepo), { signal });
  if (!res.ok) return null;
  const payload: unknown = await res.json();
  if (!Array.isArray(payload)) return null;

  const sizes = new Map<string, number>();
  for (const node of payload) {
    if (node && typeof node === 'object') {
      const { path, size } = node as { path?: unknown; size?: unknown };
      if (typeof path === 'string' && typeof size === 'number') {
        sizes.set(path, size);
      }
    }
  }
  return sizes;
}

/** A URL's `Content-Length` via `HEAD`, or `null` when unmeasurable. */
async function headContentLength(url: string, signal?: AbortSignal): Promise<number | null> {
  const res = await fetch(url, { method: 'HEAD', signal });
  if (!res.ok) return null;
  const length = Number(res.headers.get('content-length') ?? NaN);
  return Number.isFinite(length) && length > 0 ? length : null;
}
