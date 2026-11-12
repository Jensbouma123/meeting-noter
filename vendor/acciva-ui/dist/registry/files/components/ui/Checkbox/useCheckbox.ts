import { useId } from "react";

export function useCheckboxId(id: string | undefined) {
  const generatedId = useId();
  return id ?? generatedId;
}
