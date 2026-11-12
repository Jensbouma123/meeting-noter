import { useEffect, type RefObject } from "react";

export function useSelectListEffects(
  open: boolean,
  activeIndex: number,
  buttonRef: RefObject<HTMLButtonElement | null>,
  listRef: RefObject<HTMLUListElement | null>,
  setOpen: (open: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!listRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => document.removeEventListener("mousedown", onDocumentMouseDown);
  }, [open, buttonRef, listRef, setOpen]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const list = listRef.current;
    const element = list.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    if (!element) return;

    const elementTop = element.offsetTop;
    const elementBottom = elementTop + element.offsetHeight;
    const listScrollTop = list.scrollTop;
    const listVisibleBottom = listScrollTop + list.clientHeight;

    if (elementTop < listScrollTop) {
      list.scrollTop = elementTop;
    } else if (elementBottom > listVisibleBottom) {
      list.scrollTop = elementBottom - list.clientHeight;
    }
  }, [open, activeIndex, listRef]);
}
