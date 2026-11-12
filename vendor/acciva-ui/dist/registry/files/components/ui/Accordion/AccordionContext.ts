"use client";

import { createContext, useContext } from "react";
import type { AccordionVariant } from "@/components/ui/Accordion/AccordionChrome";

interface AccordionContextValue {
  expandedValues: Set<string>;
  toggleValue: (value: string) => void;
  type: "single" | "multiple";
  collapsible: boolean;
  variant: AccordionVariant;
}

export const AccordionContext = createContext<AccordionContextValue | null>(null);

export function useAccordionContext(component: string): AccordionContextValue {
  const ctx = useContext(AccordionContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <Accordion>`);
  }
  return ctx;
}
