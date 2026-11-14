import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { SelectOption } from "@/components/ui/Select/types";

const TYPEAHEAD_RESET_MS = 500;

export function useTypeahead(
  options: SelectOption[],
  open: boolean,
  onChange: (value: string) => void,
  setActiveIndex: Dispatch<SetStateAction<number>>,
  openList: () => void,
) {
  const typeaheadRef = useRef("");
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    },
    [],
  );

  return (key: string) => {
    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current);
    typeaheadRef.current += key.toLowerCase();
    typeaheadTimer.current = setTimeout(() => {
      typeaheadRef.current = "";
    }, TYPEAHEAD_RESET_MS);

    const query = typeaheadRef.current;
    const match = options.findIndex((option) => !option.disabled && option.label.toLowerCase().startsWith(query));
    if (match === -1) return;
    // Closed: open the list and select the match (Select.md accessibility contract). Open: only move the active option.
    if (!open) {
      openList();
      onChange(options[match].value);
    }
    setActiveIndex(match);
  };
}
