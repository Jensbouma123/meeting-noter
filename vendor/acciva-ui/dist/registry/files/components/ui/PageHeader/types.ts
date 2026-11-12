import type { HTMLAttributes, ReactNode } from "react";
import type { FrameMaxWidth } from "@/lib/layout-tokens";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The page's h1. */
  title: ReactNode;
  /** Muted lead under the title, clamped to `maxWidth`. */
  description?: ReactNode;
  /** Small overline above the title (section name, category, step). */
  eyebrow?: ReactNode;
  /** Page-level actions: below the title at base, inline from `sm`. */
  actions?: ReactNode;
  /** Readable-width ceiling for the title and description block. */
  maxWidth?: FrameMaxWidth;
}
