export function assignRef<T>(ref: React.Ref<T> | null | undefined, value: T | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && typeof ref === "object" && "current" in ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}
