"use client";
import { useEffect, useRef } from "react";
function useMissingLabelWarningDev(component, ref) {
    const warned = useRef(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || warned.current)
            return;
        const named = el.textContent?.trim() ||
            el.getAttribute("aria-label")?.trim() ||
            el.getAttribute("aria-labelledby")?.trim() ||
            el.getAttribute("title")?.trim();
        if (named)
            return;
        warned.current = true;
        console.warn(`[acciva-ui:a11y] icon-only-missing-label ${component} — add tooltip="..." (SC 4.1.2, 2.5.3)`, el);
    });
}
/**
 * Dev-only, non-blocking: warns once per instance when the rendered element has no text and no
 * aria-label/aria-labelledby/title. Compiles to a no-op in production builds.
 */
export const useMissingLabelWarning = process.env.NODE_ENV === "production" ? () => { } : useMissingLabelWarningDev;
