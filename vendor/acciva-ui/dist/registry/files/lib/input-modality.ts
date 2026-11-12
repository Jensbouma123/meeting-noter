/**
 * Last input modality (`pointer` for touch/mouse/pen, `keyboard`), tracked by one passive,
 * capture-phase listener pair on the document, started at import. `null` until the first input and
 * on the server; only `keyboard` means a key was pressed, so callers treat `null` as non-keyboard.
 *
 * It also owns global quiet focus: `data-quiet-focus` sits on `<html>` from load, is removed by the
 * first navigation keydown (Tab, arrows, Home/End, PageUp/PageDown) and set again by any pointerdown.
 * Typing (letters, Enter, Space, Backspace) never ends it, so a phone keyboard never turns rings on.
 * Modality is separate: any non-modifier key means `keyboard`, so an overlay opened with Enter or
 * Space still focuses its first control (SC 2.4.3) while the ring stays quiet until navigation.
 * foundation.css paints no focus indicator while it is set, so page load, tap, typing and script
 * focus never ring and keyboard navigation does (SC 2.4.7, 2.4.11).
 */
export type InputModality = "pointer" | "keyboard";

/** Keys that alone are not input, so they change neither modality nor quiet focus. */
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "OS", "Fn", "FnLock", "Hyper", "Super", "CapsLock", "NumLock", "ScrollLock"]);

/** The only keys that mean keyboard navigation and so end quiet focus (Shift+Tab is a "Tab" key). */
const NAV_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);
export const QUIET_FOCUS_ATTR = "data-quiet-focus";

let modality: InputModality | null = null;
let listening = false;

function listen(): void {
  if (listening || typeof document === "undefined") return;
  listening = true;
  const root = document.documentElement;
  root.setAttribute(QUIET_FOCUS_ATTR, "");
  const opts = { capture: true, passive: true } as const;
  document.addEventListener("pointerdown", () => {
    modality = "pointer";
    root.setAttribute(QUIET_FOCUS_ATTR, "");
  }, opts);
  document.addEventListener("keydown", (event) => {
    if (MODIFIER_KEYS.has(event.key)) return;
    modality = "keyboard";
    if (NAV_KEYS.has(event.key)) root.removeAttribute(QUIET_FOCUS_ATTR);
  }, opts);
}

// Listening starts when a module importing this one loads, so the pointerdown that opens an overlay is seen.
listen();

/** `null` (no input yet) until the first pointerdown or non-modifier keydown, and on the server. */
export function getInputModality(): InputModality | null {
  listen();
  return modality;
}
