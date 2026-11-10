/**
 * Bridges `src/lib/langid` (spoken-language identification) into the
 * meeting pipeline: registers its ~40 MB Whisper-tiny model in the same
 * download/consent flow the ASR and diarization models use (see
 * `diarization-bridge.ts` for the established pattern this mirrors), then
 * creates one `createLanguageDetector()` per active capture source once
 * consent+cache actually allow it, feeds it audio, and turns its periodic
 * detections into `MeetingState.language` — the same field the removed
 * realtime sidecar used to populate.
 *
 * Optional and non-blocking, same as diarization: transcription never waits
 * for this model, and nothing here can fail a recording — a missing/not-yet-
 * ready detector just means `MeetingState.language` stays whatever it was
 * (`null` at session start).
 *
 * Unlike diarization, this integration was not given edit access to
 * `src/lib/langid/**` itself, so the download-only step it needs
 * (`model.ts`'s only exported loader, `loadLangIdModel()`, also builds the
 * ONNX sessions — there's no bytes-only entry point to reuse) is
 * reimplemented here directly against langid's own exported manifest
 * constants and the shared resumable downloader, rather than adding one
 * there. Same *files*, same *cache* (`downloadHfFileResumable`'s IndexedDB
 * store) — just called from this side.
 */

import { downloadHfFileResumable, takeBlobUrlBytes } from '@/lib/asr/browser/resumable-download';
import {
  registerModel,
  isConsentGiven,
  getModelStatus,
  registerDownloadHandler,
  type AsrBackend,
} from '@/lib/asr/browser';
import { createLanguageDetector, type LanguageDetector } from '@/lib/langid';
import { languageNameFor } from '@/lib/langid/languages';
import { createLanguageSwitcher } from '@/lib/langid/decision';
import {
  LANGID_MODEL_REPO,
  LANGID_MODEL_REVISION,
  LANGID_MODEL_FILES,
  LANGID_MODEL_FALLBACK_SIZE_BYTES,
} from '@/lib/langid/manifest';
import type { Source } from './types';
import { getState, setState } from './store';
import { int16ToFloat32 } from './pcm';

/** Registry key — shared consent/download UI, same shape as the other entries. */
export const LANGID_REGISTRY_KEY = 'langid-whisper-tiny';

let downloadHandlerRegistered = false;

/**
 * Register the language-ID model in the shared download/consent registry
 * and, the first time only, how to actually download it.  Safe to call
 * repeatedly (mirrors `registerDiarizationModel`'s own contract).
 */
export function registerLangIdModel(backend: AsrBackend): void {
  if (!downloadHandlerRegistered) {
    registerDownloadHandler('langid', async (onProgress) => {
      // Both files, same resumable/cached path Parakeet and diarization use.
      // The blob URLs aren't needed here — `createLanguageDetector()`'s
      // worker re-resolves them from the same IndexedDB cache and builds
      // its own ONNX sessions when it actually runs (see this file's own
      // module doc comment for why the download step is duplicated rather
      // than shared code).
      const urls = await Promise.all([
        downloadHfFileResumable(LANGID_MODEL_REPO, LANGID_MODEL_FILES.encoder, LANGID_MODEL_REVISION, {
          onProgress: (p) => onProgress(p),
        }),
        downloadHfFileResumable(LANGID_MODEL_REPO, LANGID_MODEL_FILES.decoder, LANGID_MODEL_REVISION, {
          onProgress: (p) => onProgress(p),
        }),
      ]);
      // Each URL pins its Blob and the downloader keeps the bytes behind it
      // until they are taken, so an unread URL is ~40 MB held for the page's life.
      for (const url of urls) {
        takeBlobUrlBytes(url);
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      }
    });
    downloadHandlerRegistered = true;
  }

  registerModel({
    key: LANGID_REGISTRY_KEY,
    modelRepo: LANGID_MODEL_REPO,
    displayName: 'Language detection',
    estimatedSizeBytes: LANGID_MODEL_FALLBACK_SIZE_BYTES,
    description:
      'Detects which language is being spoken, run entirely on your device. Optional — ' +
      'transcripts work without it. Downloaded once and cached in your browser.',
    preCheckCache: true,
    // Cosmetic/dedup-key only here (same caveat as diarization's entry —
    // see registerDiarizationModel): langid does its own WebGPU→WASM
    // fallback per detector (model.ts), independent of this value.
    backend,
    kind: 'langid',
  });
}

/* ------------------------------------------------------------------ */
/* Per-session detector instances                                      */
/* ------------------------------------------------------------------ */

const activeDetectors = new Map<Source, LanguageDetector>();
/** True once the user has explicitly picked a language this session — see
 *  `setLanguageOverride()` / `meeting.setLanguage()` in `index.ts`. Detection
 *  keeps running underneath (cheap, and "auto" needs to resume it instantly)
 *  but stops being applied to `MeetingState.language` while this is true. */
let languageLocked = false;
/** Sources the last `startLangId()` call was given — the set detection can be
 *  (re)started for. Empty between sessions. */
let activeSources: Source[] = [];
/** The language shown for this session. Every source's detections feed one
 *  switcher, so a quiet or off-language source cannot flip the chip: below the
 *  confidence floor a detection is ignored, and a different language needs two
 *  agreeing detections (or one very sure one) to replace the current one. */
const switcher = createLanguageSwitcher();

function applyDetection(code: string, confidence: number): void {
  const accepted = switcher.offer({ code, confidence });
  if (languageLocked || !accepted) return;
  setState({ language: { code: accepted.code, name: languageNameFor(accepted.code), locked: false, confidence: accepted.confidence } });
}

/**
 * Start detecting language on every given (already-attached) source, if —
 * and only if — the user has consented, the model is already cached, **and
 * detection is actually wanted**.
 *
 * Never triggers a download or a consent prompt itself.
 *
 * The third condition is new and it is a memory fix: when the user has picked
 * a language, `applyDetection()` discards every detection (see
 * `languageLocked`), so loading two ONNX sessions and running an encoder over
 * 30s of audio every 20s produces nothing at all. A picked language is not
 * rare, it is the normal case for a Dutch-only pilot — so this was routinely
 * paying for a model whose output was thrown away, in the same breath as
 * loading the speech model.
 */
export function startLangId(sources: readonly Source[]): void {
  // Remembered so switching back to 'auto' mid-session can start detection
  // again for the same sources (see `setLanguageOverride`). Stored before the
  // early returns: a language picked while the capture was still starting
  // must not leave 'auto' with nothing to restart.
  activeSources = [...sources];
  if (languageLocked) return;
  const entry = getModelStatus(LANGID_REGISTRY_KEY);
  const available = entry?.status === 'cached' && isConsentGiven(LANGID_REGISTRY_KEY);
  if (!available) return;

  for (const source of sources) {
    if (activeDetectors.has(source)) continue;
    const detector = createLanguageDetector();
    detector.onLanguage(({ code, confidence }) => applyDetection(code, confidence));
    detector.onError((message) => {
      console.warn(`[langid:${source}] ${message}`);
    });
    activeDetectors.set(source, detector);
  }
}

/** Feed one captured audio frame to that source's detector, if one is running. */
export function pushLangIdAudio(source: Source, pcm: ArrayBuffer): void {
  const detector = activeDetectors.get(source);
  if (!detector) return;
  // The frame is Int16 PCM; the detector's mel front end needs [-1, 1] floats.
  // The conversion is a fresh buffer nobody else holds, so it is transferred
  // to the worker as is rather than copied a second time.
  detector.push(int16ToFloat32(pcm), true);
}

/** Dispose one source's detector, e.g. when that source's capture track ends
 *  while the rest of the session keeps going. */
export function stopLangIdForSource(source: Source): void {
  const detector = activeDetectors.get(source);
  if (detector) {
    detector.dispose();
    activeDetectors.delete(source);
  }
  // A track that ended cannot start detecting again, so it leaves the
  // restartable set as well.
  activeSources = activeSources.filter((s) => s !== source);
}

/** Dispose every active detector for this session. Does not reset
 *  `languageLocked` — see `resetLanguageOverride()`, called separately at
 *  the start of a *new* session. */
export function stopLangId(): void {
  for (const detector of activeDetectors.values()) detector.dispose();
  activeDetectors.clear();
  activeSources = [];
  switcher.reset();
}

/* ------------------------------------------------------------------ */
/* User-driven override — meeting.setLanguage() in index.ts             */
/* ------------------------------------------------------------------ */

/**
 * Apply a user-picked language override, or `'auto'` to release it back to
 * live detection. This is what `meeting.setLanguage()` calls.
 *
 * Releasing to `'auto'` starts detection if it isn't running yet. Without
 * that, the "don't load a model whose output is discarded" rule above (see
 * `startLangId`) would trade a memory fix for a broken feature: a session that
 * began on a picked language would never detect anything again, and the
 * language chip would sit on the stale override for the rest of the meeting.
 */
export function setLanguageOverride(code: string): void {
  if (code === 'auto') {
    languageLocked = false;
    // Detection kept running underneath while locked, so its latest result
    // applies at once. With none yet, the override stays shown but is no
    // longer marked as picked — otherwise the chip reads "locked" for the
    // 20 s or more until the next detection lands.
    const best = switcher.current;
    const current = getState().language;
    if (best) {
      setState({ language: { code: best.code, name: languageNameFor(best.code), locked: false, confidence: best.confidence } });
    } else if (current?.locked) {
      setState({ language: { ...current, locked: false } });
    }
    if (activeSources.length > 0) startLangId(activeSources);
    return;
  }
  languageLocked = true;
  setState({ language: { code, name: languageNameFor(code), locked: true, confidence: 1 } });
}

/** Reset override/lock state for a fresh session. */
export function resetLanguageOverride(): void {
  languageLocked = false;
  switcher.reset();
}
