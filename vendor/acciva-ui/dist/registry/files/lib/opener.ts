/**
 * The element an overlay should return focus to on close (SC 2.4.3). macOS/iOS WebKit does not
 * focus a button on click, so after a click-open `document.activeElement` is `<body>`. One passive,
 * capture-phase pointerdown listener, started at import like input-modality.ts, records the nearest
 * focusable ancestor of the last press so callers without a trigger ref still find the opener.
 */
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

let lastPressed: HTMLElement | null = null;
let listening = false;

function listen(): void {
  if (listening || typeof document === "undefined") return;
  listening = true;
  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    lastPressed = target instanceof Element ? target.closest<HTMLElement>(FOCUSABLE) : null;
  }, { capture: true, passive: true });
}

listen();

/** A real focus target: connected, not the page root, and able to take focus. */
function usable(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  const doc = el.ownerDocument;
  return el !== doc.body && el !== doc.documentElement && typeof el.focus === "function";
}

/**
 * The focused element when there is one; otherwise `trigger`, else the last pressed focusable
 * element (WebKit click). WebKit focuses the nearest click-focusable ancestor instead of the
 * button (e.g. `<main tabIndex={-1}>`), so a focused container holding either candidate yields
 * to it. `exclude` drops candidates inside the overlay itself.
 */
export function resolveOpener(trigger?: HTMLElement | null, exclude?: Element | null): HTMLElement | null {
  listen();
  const outside = (el: HTMLElement) => !exclude?.contains(el);
  const active = document.activeElement;
  const candidate = [trigger, lastPressed].find((el) => usable(el) && outside(el));
  if (usable(active) && outside(active) && !(candidate && candidate !== active && active.contains(candidate))) return active;
  return candidate ?? null;
}
