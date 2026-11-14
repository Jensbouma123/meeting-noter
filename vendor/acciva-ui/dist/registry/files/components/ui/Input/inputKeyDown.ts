import type { KeyboardEvent } from "react";
import type { InputProps } from "@/components/ui/Input/types";

// Native search behaviour: Escape clears a non-empty field. A handler that used the key (closing a popup) wins.
export function createInputKeyDown(
  onKeyDown: InputProps["onKeyDown"],
  searchClearable: boolean,
  hasValue: boolean,
  onClear: () => void,
) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.key === "Escape" && !event.defaultPrevented && searchClearable && hasValue) {
      event.preventDefault();
      onClear();
    }
  };
}
