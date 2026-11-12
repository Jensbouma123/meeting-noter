import { FOCUS_SC } from "@/lib/color/audit/sc";
import type { RequiredPair } from "@/lib/color/audit/types";

export const FOCUS_PAIRS: readonly RequiredPair[] = [
  {
    id: "focus-on-canvas",
    label: "Focus indicator against the page canvas",
    foreground: "border.focus",
    background: "background.canvas",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
  {
    id: "focus-on-surface",
    label: "Focus indicator against a card surface",
    foreground: "border.focus",
    background: "background.surface",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
  {
    id: "focus-on-raised",
    label: "Focus indicator against a raised surface",
    foreground: "border.focus",
    background: "background.raised",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
  {
    id: "focus-on-dialog",
    label: "Focus indicator against a dialog surface",
    foreground: "border.focus",
    background: "background.dialog",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
  {
    id: "focus-on-focus-offset",
    label: "Focus indicator against the offset ring inside it",
    foreground: "border.focus",
    background: "border.focusOffset",
    use: "ui",
    sc: FOCUS_SC,
    // The engine solves the outer ring against the four surfaces first, then
    // cuts the offset ring to clear it and both fills, so the offset ring — the
    // background here — is the side a solver may move.
    adjustable: "background",
  },
  {
    id: "focus-offset-on-brand-fill",
    label: "Focus offset ring against the brand control fill it outlines",
    foreground: "border.focusOffset",
    background: "accent.brand",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
  {
    id: "focus-offset-on-secondary-fill",
    label: "Focus offset ring against the secondary control fill it outlines",
    foreground: "border.focusOffset",
    background: "accent.secondary",
    use: "ui",
    sc: FOCUS_SC,
    adjustable: "foreground",
  },
];
