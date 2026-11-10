/** Merges a manually-managed ref with whatever ref the caller already attached to `child`. */
export function assignRef(ref, value) {
    if (typeof ref === "function") {
        ref(value);
    }
    else if (ref) {
        ref.current = value;
    }
}
