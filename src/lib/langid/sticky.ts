/** Sticky spoken language: lock one language once speech has agreed on it,
 *  and only let go after a sustained run in another. The result is the hint
 *  handed to the ASR, so a stray word or short fragment cannot flip it. */
import type { Detection } from './decision';

/** Below this a detection is noise: ignored, it neither builds nor breaks a run. */
export const STICKY_MIN_CONFIDENCE = 0.6;
/** A first detection this sure locks at once (one ~20 s window of speech). */
export const STICKY_ESTABLISH_CONFIDENCE = 0.85;
/** Consecutive agreeing detections that establish a language otherwise. */
export const STICKY_ESTABLISH_RUNS = 2;
/** Consecutive detections in another language before the lock moves. */
export const STICKY_SWITCH_RUNS = 3;

export function createStickyLanguage() {
  let locked: string | undefined;
  let candidate: string | undefined;
  let run = 0;
  const clearRun = () => {
    candidate = undefined;
    run = 0;
  };
  return {
    /** Feed one detection; returns the locked language (undefined until established). */
    offer({ code, confidence }: Detection): string | undefined {
      if (confidence < STICKY_MIN_CONFIDENCE) return locked;
      if (code === locked) {
        clearRun();
        return locked;
      }
      run = candidate === code ? run + 1 : 1;
      candidate = code;
      const needed = locked === undefined ? STICKY_ESTABLISH_RUNS : STICKY_SWITCH_RUNS;
      if (run >= needed || (locked === undefined && confidence >= STICKY_ESTABLISH_CONFIDENCE)) {
        locked = code;
        clearRun();
      }
      return locked;
    },
    get current(): string | undefined {
      return locked;
    },
    reset(): void {
      locked = undefined;
      clearRun();
    },
  };
}
