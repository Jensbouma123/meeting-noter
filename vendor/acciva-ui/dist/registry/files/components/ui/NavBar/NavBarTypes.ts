import type { ElementType, ReactNode } from "react";

export interface NavBarItem {
  href: string;
  label: string;
  /** Decorative leading icon; the label stays the accessible name. */
  icon?: ReactNode;
  /** Marks the active destination: `aria-current="page"`. */
  current?: boolean;
}

export interface NavBarProps {
  items: NavBarItem[];
  /** Names the landmark; distinct per nav on a page. */
  "aria-label"?: string;
  /** Link-as-child slot: a router link taking `href` (Next `Link`). Defaults to `<a>`. */
  linkComponent?: ElementType;
  className?: string;
}
