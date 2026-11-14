import type { SearchComboboxProps } from "./types.js";
/** Search-and-go combobox: type to filter, Enter/click follows a link option or runs an action. No committed value. */
export declare function SearchCombobox({ id, options, label, "aria-label": ariaLabel, placeholder, emptyMessage, disabled, onNavigate, optionHeight, maxListHeight, filter, className, }: SearchComboboxProps): import("react").JSX.Element;
