import { useRef, type KeyboardEvent } from "react";

// Arrow / Home / End roving focus across the enabled triggers inside the accordion root.
export function useAccordionKeyboard() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const triggers = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[data-accordion-trigger="true"]:not([disabled])'),
    );
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
