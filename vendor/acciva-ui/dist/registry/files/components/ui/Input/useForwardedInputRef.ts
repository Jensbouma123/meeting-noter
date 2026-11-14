import type { ForwardedRef } from "react";
import { useImperativeHandle, useRef } from "react";

// Keeps a local input ref and forwards the element to the caller's ref.
export function useForwardedInputRef(forwardedRef: ForwardedRef<HTMLInputElement>) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
  return inputRef;
}
