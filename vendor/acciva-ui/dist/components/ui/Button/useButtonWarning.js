import { useEffect } from "react";
/** Dev-only: an iconOnly button without a real tooltip has no accessible name. */
export function useButtonWarning(iconOnly, hasTooltip) {
    useEffect(() => {
        if (process.env.NODE_ENV === "production")
            return;
        if (!iconOnly || hasTooltip)
            return;
        console.error("[a11y] <Button iconOnly> requires a non-blank `tooltip`. It is the button's only text: it renders the tooltip and supplies the accessible name (WCAG 2.2 AA SC 4.1.2).");
    }, [iconOnly, hasTooltip]);
}
