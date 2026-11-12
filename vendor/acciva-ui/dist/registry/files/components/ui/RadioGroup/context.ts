"use client";

import { createContext, useContext } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export interface RadioGroupContextValue {
  name: string;
  value: string | null;
  onChange: (value: string) => void;
  size: ResponsiveSize<SizeTier>;
  disabled: boolean;
  orientation: "vertical" | "horizontal";
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(component: string): RadioGroupContextValue {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within a <RadioGroup>`);
  }
  return ctx;
}
