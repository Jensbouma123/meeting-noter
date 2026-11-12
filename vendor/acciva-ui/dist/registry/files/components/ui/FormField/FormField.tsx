"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import type { ResponsiveSize, SizeTier } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { FormDescription, FormLabel, FormMessage } from "@/components/ui/FormField/FormFieldParts";
import { FormFieldContext } from "@/components/ui/FormField/useFormField";

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  id?: string;
  name?: string;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  size?: ResponsiveSize<SizeTier>;
  children: ReactNode;
}

export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  {
    id: customId,
    label,
    hint,
    error,
    required = false,
    disabled = false,
    size = "md",
    className,
    children,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = customId ?? generatedId;
  const labelId = `${fieldId}-label`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedBy = [hint ? hintId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  let renderedChild: ReactNode = children;
  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const existingDescribedBy = child.props["aria-describedby"] as string | undefined;
    const mergedDescribedBy = [describedBy, existingDescribedBy].filter(Boolean).join(" ") || undefined;

    renderedChild = cloneElement(child, {
      id: (child.props.id as string | undefined) ?? fieldId,
      "aria-describedby": mergedDescribedBy,
      disabled: disabled || Boolean(child.props.disabled),
      required: required || Boolean(child.props.required),
    });
  }

  return (
    <FormFieldContext.Provider
      value={{
        id: fieldId,
        labelId,
        hintId,
        errorId,
        describedBy,
        error,
        hint: typeof hint === "string" ? hint : undefined,
        required,
        disabled,
        size,
      }}
    >
      <VStack ref={ref} spacing="sm" className={cn("w-full", className)} {...props}>
        {label ? <FormLabel>{label}</FormLabel> : null}
        {renderedChild}
        {hint && !error ? <FormDescription>{hint}</FormDescription> : null}
        {error ? <FormMessage>{error}</FormMessage> : null}
      </VStack>
    </FormFieldContext.Provider>
  );
});
