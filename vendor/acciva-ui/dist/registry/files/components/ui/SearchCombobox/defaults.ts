import type { SearchComboboxOption } from "@/components/ui/SearchCombobox/types";

export const DEFAULT_OPTION_HEIGHT = 40;
export const DEFAULT_MAX_LIST_HEIGHT = 320;

export function defaultFilter(option: SearchComboboxOption, query: string): boolean {
  return `${option.label} ${option.keywords ?? ""}`.toLowerCase().includes(query);
}
