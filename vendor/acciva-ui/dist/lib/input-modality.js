/** Keys that alone are not input, so they change neither modality nor quiet focus. */
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "OS", "Fn", "FnLock", "Hyper", "Super", "CapsLock", "NumLock", "ScrollLock"]);
/** The only keys that mean keyboard navigation and so end quiet focus (Shift+Tab is a "Tab" key). */
const NAV_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"]);
export const QUIET_FOCUS_ATTR = "data-quiet-focus";
let modality = null;
let listening = false;
function listen() {
    if (listening || typeof document === "undefined")
        return;
    listening = true;
    const root = document.documentElement;
    root.setAttribute(QUIET_FOCUS_ATTR, "");
    const opts = { capture: true, passive: true };
    document.addEventListener("pointerdown", () => {
        modality = "pointer";
        root.setAttribute(QUIET_FOCUS_ATTR, "");
    }, opts);
    document.addEventListener("keydown", (event) => {
        if (MODIFIER_KEYS.has(event.key))
            return;
        modality = "keyboard";
        if (NAV_KEYS.has(event.key))
            root.removeAttribute(QUIET_FOCUS_ATTR);
    }, opts);
}
// Listening starts when a module importing this one loads, so the pointerdown that opens an overlay is seen.
listen();
/** `null` (no input yet) until the first pointerdown or non-modifier keydown, and on the server. */
export function getInputModality() {
    listen();
    return modality;
}
