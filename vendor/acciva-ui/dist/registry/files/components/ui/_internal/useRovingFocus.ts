import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { rovingIndex, typeaheadIndex, type RovingOrientation } from "@/components/ui/_internal/rovingIndex";

interface RovingFocusOptions {
  containerRef: RefObject<HTMLElement | null>;
  /** Enabled items only, e.g. `[role="tab"]:not([disabled])`; also works for links. */
  itemSelector: string;
  orientation: RovingOrientation;
  /** Default true: arrows wrap past either end. */
  wrap?: boolean;
  /** Click the item after focusing it (selection follows focus: tabs, radios). */
  activate?: boolean;
  /** Match item text on printable keys; pass a label getter to enable. */
  typeahead?: (item: HTMLElement) => string;
  /** Keep exactly one item a tab stop: the one matching, else the first. */
  tabStop?: (item: HTMLElement) => boolean;
}

const TYPEAHEAD_RESET_MS = 500;

/**
 * Roving focus over DOM items (buttons, links, radios): arrows per `orientation`,
 * Home/End, wrap and optional typeahead. Returns the keydown handler for the container.
 */
export function useRovingFocus(options: RovingFocusOptions) {
  const { containerRef, itemSelector, orientation, wrap = true, activate = false, typeahead, tabStop } = options;
  const buffer = useRef({ text: "", at: 0 });

  const items = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(itemSelector) ?? []);

  useLayoutEffect(() => {
    if (!tabStop) return;
    const all = items();
    const stop = all.find(tabStop) ?? all[0];
    all.forEach((item) => {
      item.tabIndex = item === stop ? 0 : -1;
    });
  });

  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const list = items();
    const current = list.findIndex((item) => item === document.activeElement);
    if (current === -1) return;

    let next = rovingIndex({ key: event.key, current, count: list.length, orientation, wrap });
    if (next === null && typeahead && event.key.length === 1 && event.key !== " ") {
      const now = Date.now();
      const text = (now - buffer.current.at > TYPEAHEAD_RESET_MS ? "" : buffer.current.text) + event.key;
      buffer.current = { text, at: now };
      next = typeaheadIndex(list.map(typeahead), current, text);
    }
    if (next === null) return;

    event.preventDefault();
    list[next].focus();
    if (activate) list[next].click();
  };
}
