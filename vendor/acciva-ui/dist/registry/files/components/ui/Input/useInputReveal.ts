import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Returns `[revealed, handleToggleReveal]`. */
export function useInputReveal(inputRef: RefObject<HTMLInputElement | null>) {
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleToggleReveal = () => {
    const el = inputRef.current;
    if (el) {
      const end = el.value.length;
      pendingSelectionRef.current = {
        start: el.selectionStart ?? end,
        end: el.selectionEnd ?? end,
      };
    }
    setRevealed((prev) => !prev);
  };

  useLayoutEffect(() => {
    const el = inputRef.current;
    const pending = pendingSelectionRef.current;
    if (el && pending) {
      el.setSelectionRange(pending.start, pending.end);
      pendingSelectionRef.current = null;
    }
  }, [revealed, inputRef]);

  return [revealed, handleToggleReveal] as const;
}
