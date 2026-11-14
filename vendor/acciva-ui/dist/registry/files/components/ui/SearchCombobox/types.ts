import type { ReactNode } from "react";

/** One command-palette row: a link (`href`) or an action (`onSelect`). Neither is committed as a value. */
export interface SearchComboboxOption {
  /** Stable key, unique within `options`. */
  value: string;
  label: string;
  /** Navigates here on select (via `onNavigate`, default `location.assign`). Wins over `onSelect`. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  /** Decorative leading adornment (hidden from assistive tech). */
  icon?: ReactNode;
  /** Extra text the default filter also matches (synonyms), never shown. */
  keywords?: string;
}

export interface SearchComboboxProps {
  id?: string;
  options: readonly SearchComboboxOption[];
  /** Visible label above the field. Without it, pass `aria-label`. */
  label?: string;
  "aria-label"?: string;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Called with an option's `href`; use it for client-side routing. Defaults to `window.location.assign`. */
  onNavigate?: (href: string) => void;
  optionHeight?: number;
  maxListHeight?: number;
  filter?: (option: SearchComboboxOption, query: string) => boolean;
  className?: string;
}
