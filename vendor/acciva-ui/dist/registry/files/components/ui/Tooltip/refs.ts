/** Merges a manually-managed ref with whatever ref the caller already attached to `child`. */
export function assignRef<T>(ref: React.Ref<T> | null | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}
