import type { SearchableSelectOption } from "@/components/ui/SearchableSelect/types";

export const DEFAULT_OPTION_HEIGHT = 36;
export const DEFAULT_MAX_LIST_HEIGHT = 288;

export function defaultFilter(option: SearchableSelectOption, query: string): boolean {
  return option.label.toLowerCase().includes(query);
}
