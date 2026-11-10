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
export declare const QUIET_FOCUS_ATTR = "data-quiet-focus";
/** `null` (no input yet) until the first pointerdown or non-modifier keydown, and on the server. */
export declare function getInputModality(): InputModality | null;
