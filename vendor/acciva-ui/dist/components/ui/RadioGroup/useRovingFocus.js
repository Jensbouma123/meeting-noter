import { useLayoutEffect } from "react";
/**
 * Roving tabindex for a radio group: exactly one radio is a tab stop (the checked one,
 * or the first enabled one when nothing is checked), and arrow/Home/End keys move
 * between enabled radios. Returns the keydown handler for the group element.
 */
export function useRovingFocus(groupRef) {
    // With nothing checked the group must still be one tab stop: the first enabled radio.
    useLayoutEffect(() => {
        const radios = groupRef.current?.querySelectorAll('[role="radio"]');
        const first = groupRef.current?.querySelector('[role="radio"]:not([aria-disabled="true"])');
        const anyChecked = groupRef.current?.querySelector('[role="radio"][aria-checked="true"]');
        radios?.forEach((r) => {
            r.tabIndex = r.getAttribute("aria-checked") === "true" || (!anyChecked && r === first) ? 0 : -1;
        });
    });
    return (event) => {
        const group = groupRef.current;
        if (!group)
            return;
        const radios = Array.from(group.querySelectorAll('[role="radio"]:not([aria-disabled="true"])'));
        if (radios.length === 0)
            return;
        const currentIndex = radios.findIndex((r) => r === document.activeElement);
        if (currentIndex === -1)
            return;
        let nextIndex = null;
        switch (event.key) {
            case "ArrowDown":
            case "ArrowRight":
                nextIndex = (currentIndex + 1) % radios.length;
                break;
            case "ArrowUp":
            case "ArrowLeft":
                nextIndex = (currentIndex - 1 + radios.length) % radios.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = radios.length - 1;
                break;
            default:
                return;
        }
        event.preventDefault();
        const target = radios[nextIndex];
        target.focus();
        target.click();
    };
}
