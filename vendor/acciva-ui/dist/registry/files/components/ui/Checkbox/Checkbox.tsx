"use client";

import { forwardRef, useCallback, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CheckboxIndicator } from "@/components/ui/Checkbox/CheckboxParts";
import { useCheckboxId } from "@/components/ui/Checkbox/useCheckbox";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  indeterminate?: boolean;
  /** Merged onto the label text span. `className` styles the root `<label>`. */
  labelClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, labelClassName, label, indeterminate = false, id, checked, disabled, onKeyDown, ...props },
  ref,
) {
  const checkboxId = useCheckboxId(id);
  const attachRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [indeterminate, ref],
  );

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        "inline-flex select-none items-center gap-2 text-sm text-foreground",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className,
      )}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
        <input
          ref={attachRef}
          type="checkbox"
          id={checkboxId}
          checked={checked}
          disabled={disabled}
          aria-checked={indeterminate ? "mixed" : checked}
          className="peer sr-only"
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.key !== "Enter") return;
            event.preventDefault();
            event.currentTarget.click();
          }}
          {...props}
        />
        <CheckboxIndicator checked={checked} indeterminate={indeterminate} />
      </span>
      {label ? <span className={cn("font-medium", labelClassName)}>{label}</span> : null}
    </label>
  );
});
