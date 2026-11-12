"use client";

import { createContext, useContext } from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";

export interface FormFieldContextValue {
  id: string;
  labelId: string;
  hintId: string;
  errorId: string;
  describedBy: string | undefined;
  error?: string;
  hint?: string;
  required: boolean;
  disabled: boolean;
  size: ResponsiveSize<SizeTier>;
}

export const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export function useFormField() {
  const ctx = useContext(FormFieldContext);
  if (!ctx) {
    throw new Error("useFormField must be used within a <FormField>");
  }
  return ctx;
}
