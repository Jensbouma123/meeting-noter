import { useImperativeHandle, useRef } from "react";
// Keeps a local input ref and forwards the element to the caller's ref.
export function useForwardedInputRef(forwardedRef) {
    const inputRef = useRef(null);
    useImperativeHandle(forwardedRef, () => inputRef.current);
    return inputRef;
}
