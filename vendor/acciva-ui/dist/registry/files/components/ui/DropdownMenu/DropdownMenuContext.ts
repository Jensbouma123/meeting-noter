"use client";

import { createContext, useContext } from "react";

export interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  triggerId: string;
  /** Dashed ident linking the trigger (`anchor-name`) to the menu (`position-anchor`). */
  anchorName: string;
  /** Open state at the trigger's last pointerdown: a light dismiss closes the menu before `click` fires. */
  openAtPointerDownRef: React.MutableRefObject<boolean | null>;
  /** Set by the trigger on ArrowUp so the opened menu focuses its last item. */
  openLastRef: React.MutableRefObject<boolean>;
}

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(component: string): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <DropdownMenu>`);
  }
  return ctx;
}
