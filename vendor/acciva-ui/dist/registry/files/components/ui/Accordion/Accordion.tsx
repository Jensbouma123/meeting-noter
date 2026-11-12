"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ROOT_CHROME, type AccordionVariant } from "@/components/ui/Accordion/AccordionChrome";
import { AccordionContext } from "@/components/ui/Accordion/AccordionContext";
import { useAccordionKeyboard } from "@/components/ui/Accordion/useAccordionKeyboard";
import { useAccordionValue } from "@/components/ui/Accordion/useAccordionValue";

export interface AccordionProps extends HTMLAttributes<HTMLDivElement> {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  variant?: AccordionVariant;
  children: ReactNode;
}

export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    type = "single",
    value: controlledValue,
    defaultValue,
    onValueChange,
    collapsible = true,
    variant = "default",
    className,
    children,
    ...props
  },
  ref,
) {
  const { expandedValues, toggleValue } = useAccordionValue(
    type,
    collapsible,
    controlledValue,
    defaultValue,
    onValueChange,
  );
  const { containerRef, handleKeyDown } = useAccordionKeyboard();

  return (
    <AccordionContext.Provider
      value={{
        expandedValues,
        toggleValue,
        type,
        collapsible,
        variant,
      }}
    >
      <div
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        onKeyDown={handleKeyDown}
        className={cn(ROOT_CHROME[variant], className)}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
