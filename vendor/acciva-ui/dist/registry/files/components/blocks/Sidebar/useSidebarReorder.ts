import { useEffect, useRef, useState, type RefObject } from "react";
import type { SidebarItem, SidebarReorderMove } from "@/components/blocks/Sidebar/SidebarTypes";

export function useSidebarReorder({
  items,
  onReorder,
  railRefs,
  drawerRefs,
}: {
  items: SidebarItem[];
  onReorder?: (move: SidebarReorderMove) => void;
  railRefs: RefObject<(HTMLAnchorElement | null)[]>;
  drawerRefs: RefObject<(HTMLAnchorElement | null)[]>;
}) {
  // Alt+Arrow moves the row, which React re-inserts; refocus the moved link after commit.
  const pendingFocus = useRef<{ list: "rail" | "drawer"; index: number } | null>(null);
  // Polite announcement of the last move (SC 4.1.3); keyed by item count so it resets
  // when the list itself changes shape, not on every reorder.
  const [reorderNote, setReorderNote] = useState<{ text: string; key: number } | null>(null);
  const visibleReorderNote = reorderNote && reorderNote.key === items.length ? reorderNote.text : "";

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    const refs = pending.list === "rail" ? railRefs.current : drawerRefs.current;
    refs[pending.index]?.focus({ preventScroll: true });
  });

  const queueFocus = (list: "rail" | "drawer", index: number) => {
    pendingFocus.current = { list, index };
  };

  const handleReorderMove = (from: number, to: number) => {
    if (!onReorder || from === to) return;
    setReorderNote({
      text: `Moved ${items[from].label} to position ${to + 1} of ${items.length}`,
      key: items.length,
    });
    onReorder({ from, to });
  };

  return { queueFocus, visibleReorderNote, handleReorderMove };
}
