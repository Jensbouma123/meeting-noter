"use client";

import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { TEXT_SIZE, resolveResponsive } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";
import { VStack } from "@/components/ui/VStack";
import { useFormField } from "@/components/ui/FormField/useFormField";

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children?: ReactNode;
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(function FormLabel(
  { className, children, ...props },
  ref,
) {
  const { id, labelId, required, disabled, size } = useFormField();

  return (
    <label
      ref={ref}
      id={labelId}
      htmlFor={id}
      className={cn(
        "font-medium text-foreground",
        resolveResponsive(size, TEXT_SIZE),
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      {...props}
    >
      {children}
      {required ? <span className="ml-0.5 text-danger">*</span> : null}
    </label>
  );
});

export interface FormDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export const FormDescription = forwardRef<HTMLParagraphElement, FormDescriptionProps>(function FormDescription(
  { className, children, ...props },
  ref,
) {
  const { hintId } = useFormField();

  return (
    <p ref={ref} id={hintId} className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
});

export interface FormMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export const FormMessage = forwardRef<HTMLParagraphElement, FormMessageProps>(function FormMessage(
  { className, children, ...props },
  ref,
) {
  const { errorId, error } = useFormField();
  const message = children ?? error;

  if (!message) return null;

  return (
    <p
      ref={ref}
      id={errorId}
      role="alert"
      className={cn("text-xs font-medium text-danger animate-fade-in", className)}
      {...props}
    >
      {message}
    </p>
  );
});

export interface FormGroupProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const FormGroup = forwardRef<HTMLDivElement, FormGroupProps>(function FormGroup(
  { className, children, ...props },
  ref,
) {
  return (
    <VStack ref={ref} spacing="lg" className={cn("sm:gap-6", className)} {...props}>
      {children}
    </VStack>
  );
});
