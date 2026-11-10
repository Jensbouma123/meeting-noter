export function assignRef(ref, value) {
    if (typeof ref === "function") {
        ref(value);
    }
    else if (ref && typeof ref === "object" && "current" in ref) {
        ref.current = value;
    }
}
