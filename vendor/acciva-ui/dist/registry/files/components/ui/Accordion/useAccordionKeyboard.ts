import { useRef, type KeyboardEvent } from "react";

// Arrow / Home / End roving focus across the enabled triggers inside the accordion root.
export function useAccordionKeyboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    // Only this root's own triggers: a nested <Accordion>'s triggers belong to its own root.
    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-accordion-trigger="true"]:not([disabled])'),
    ).filter((t) => t.closest('[data-accordion-root="true"]') === container);
    if (triggers.length === 0) return;

    const currentIndex = triggers.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % triggers.length;
        break;
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = triggers.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    triggers[nextIndex]?.focus();
  };

  return { containerRef, handleKeyDown };
}
