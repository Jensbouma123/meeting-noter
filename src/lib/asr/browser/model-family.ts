/**
 * Which speech model the user picked: Parakeet TDT v3 or Nemotron 3.5 ASR.
 *
 * A family, not a manifest: each family still has its own WebGPU/WASM
 * variants, and `backend-detect.ts` resolves the variant inside the family
 * (`activeAsrManifest`). Persisted per browser; read lazily, never during
 * a server render (`getServerAsrModelFamily`).
 */

export type AsrModelFamily = 'parakeet' | 'nemotron';

export const ASR_MODEL_FAMILIES: readonly AsrModelFamily[] = Object.freeze(['parakeet', 'nemotron']);

/**
 * The family a browser without a stored choice gets.
 *
 * Parakeet: on the AMI bench (`nemotron-asr.md` in the exchange dir)
 * Nemotron's WER is worse, so it is opt-in.
 */
export const DEFAULT_ASR_MODEL_FAMILY: AsrModelFamily = 'parakeet';

const STORAGE_KEY = 'meeting-noter:asr-model-family';

let family: AsrModelFamily | null = null;
const listeners = new Set<() => void>();

function isFamily(value: unknown): value is AsrModelFamily {
  return typeof value === 'string' && (ASR_MODEL_FAMILIES as readonly string[]).includes(value);
}

function readStored(): AsrModelFamily | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return isFamily(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** The selected family (the stored choice, else the default). */
export function getAsrModelFamily(): AsrModelFamily {
  family ??= readStored() ?? DEFAULT_ASR_MODEL_FAMILY;
  return family;
}

/** What a server render shows: the default, since storage is per browser. */
export function getServerAsrModelFamily(): AsrModelFamily {
  return DEFAULT_ASR_MODEL_FAMILY;
}

/**
 * Store a new choice. Only the selection — the caller (`selectSpeechModel`
 * in `browser-asr.ts`) drops the loaded engine and re-registers the entry.
 */
export function setAsrModelFamily(next: AsrModelFamily): void {
  if (getAsrModelFamily() === next) return;
  family = next;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage refused (private mode): the choice lasts for this page only.
  }
  for (const fn of listeners) fn();
}

export function subscribeAsrModelFamily(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function resetAsrModelFamilyForTests(): void {
  family = null;
  listeners.clear();
}
