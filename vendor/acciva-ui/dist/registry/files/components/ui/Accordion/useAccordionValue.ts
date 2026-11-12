import { useCallback, useMemo, useState } from "react";

// Open-item state for `<Accordion>`: controlled when `controlledValue` is set, uncontrolled otherwise.
export function useAccordionValue(
  type: "single" | "multiple",
  collapsible: boolean,
  controlledValue: string | string[] | undefined,
  defaultValue: string | string[] | undefined,
  onValueChange: ((value: string | string[]) => void) | undefined,
) {
  const [uncontrolledValue, setUncontrolledValue] = useState<Set<string>>(() => {
    if (defaultValue) {
      return new Set(Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
    }
    return new Set();
  });

  const isControlled = controlledValue !== undefined;
  const expandedValues = useMemo(() => {
    return isControlled
      ? new Set(Array.isArray(controlledValue) ? controlledValue : controlledValue ? [controlledValue] : [])
      : uncontrolledValue;
  }, [isControlled, controlledValue, uncontrolledValue]);

  const toggleValue = useCallback(
    (itemValue: string) => {
      const nextSet = new Set(expandedValues);
      if (type === "single") {
        if (nextSet.has(itemValue)) {
          if (collapsible) nextSet.clear();
        } else {
          nextSet.clear();
          nextSet.add(itemValue);
        }
      } else {
        if (nextSet.has(itemValue)) {
          nextSet.delete(itemValue);
        } else {
          nextSet.add(itemValue);
        }
      }

      if (!isControlled) {
        setUncontrolledValue(nextSet);
      }

      if (onValueChange) {
        const nextArray = Array.from(nextSet);
        onValueChange(type === "single" ? nextArray[0] ?? "" : nextArray);
      }
    },
    [expandedValues, type, collapsible, isControlled, onValueChange],
  );

  return { expandedValues, toggleValue };
}
