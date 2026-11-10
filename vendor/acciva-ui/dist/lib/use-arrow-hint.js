"use client";
import { useEffect, useId, useState } from "react";
// One hint per widget kind per page load; module state resets on a full reload only.
const shown = new Set();
/** Test hook: forget which hints were already shown. */
export function resetArrowHints() {
    shown.clear();
    lastInput = "keyboard";
}
const ARROWS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
// Last input modality, tracked once per document: jsdom and older browsers have no reliable :focus-visible.
let lastInput = "keyboard";
let tracking = false;
function trackModality() {
    if (tracking || typeof document === "undefined")
        return;
    tracking = true;
    document.addEventListener("keydown", () => (lastInput = "keyboard"), true);
    document.addEventListener("pointerdown", () => (lastInput = "pointer"), true);
}
/**
 * First-keyboard-focus arrow-key hint (SC 3.3.2). Spread `groupProps` on the
 * composite's root, render `<ArrowHint>` inside it, and merge `describedBy(...)`
 * into its aria-describedby. `hint === false` disables it.
 */
export function useArrowHint(kind, hint, fallback) {
    const id = `${useId()}-arrow-hint`;
    const [visible, setVisible] = useState(false);
    useEffect(trackModality, []);
    const text = hint === false ? null : (hint ?? fallback);
    const hide = () => setVisible(false);
    const groupProps = {
        onFocusCapture: () => {
            if (!text || lastInput === "pointer" || shown.has(kind))
                return;
            shown.add(kind);
            setVisible(true);
        },
        onBlurCapture: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
                hide();
        },
        onKeyDownCapture: (event) => {
            if (ARROWS.has(event.key) || event.key === "Escape")
                hide();
        },
    };
    const show = visible && text !== null;
    return {
        groupProps,
        visible: show,
        id,
        text,
        describedBy: (existing) => [existing, show ? id : undefined].filter(Boolean).join(" ") || undefined,
    };
}
