import { renderBuiltIn } from "./builtIn.js";
import { renderCustomLockup } from "./customLockup.js";
import { renderCustomMark } from "./customMark.js";
export function Logo({ variant = "full", size = "md", mark, src, alt, className, "aria-label": customAriaLabel, ...rest }) {
    const ariaLabel = customAriaLabel ?? (alt || "ACCIVA UI");
    const isAriaHidden = rest["aria-hidden"] === true || rest["aria-hidden"] === "true";
    // A custom mark never changes the wordmark-only lockup, so it shares the built-in render.
    if ((!mark && !src) || variant === "wordmark") {
        return renderBuiltIn(variant, size, ariaLabel, className, rest);
    }
    if (variant === "mark") {
        return renderCustomMark(size, mark, src, alt, ariaLabel, isAriaHidden, className, rest);
    }
    return renderCustomLockup(variant, size, mark, src, ariaLabel, isAriaHidden, className, rest);
}
