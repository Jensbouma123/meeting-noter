import { useId } from "react";
export function useCheckboxId(id) {
    const generatedId = useId();
    return id ?? generatedId;
}
