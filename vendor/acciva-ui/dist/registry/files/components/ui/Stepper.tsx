"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { StepperItem, stateOf } from "@/components/ui/Stepper/StepperItem";

export type StepperVariant = "dots" | "chips";

export interface StepperProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Step labels in order. Empty renders nothing. Rendered verbatim, never as HTML. */
  steps: string[];
  /** Zero-based index of the current step. Clamped to `0..steps.length - 1`. */
  current: number;
  /** Compact dots or labelled pills. */
  variant?: StepperVariant;
  /**
   * Makes completed steps (and any `isStepAllowed` step) real buttons that call this
   * with the step index. Omitted keeps the stepper display-only. In `chips` the phone
   * base shows a visible "Step n of m" line above the wrapping chip row.
   */
  onStepRequest?: (index: number) => void;
  /** Extra steps (e.g. visited-ahead) that may be requested; the current step never is. */
  isStepAllowed?: (index: number) => boolean;
}

export const Stepper = forwardRef<HTMLElement, StepperProps>(function Stepper(
  { steps, current, variant = "dots", onStepRequest, isStepAllowed, className, ...props },
  ref,
) {
  if (steps.length === 0) return null;
  const clamped = Number.isFinite(current)
    ? Math.min(Math.max(Math.floor(current), 0), steps.length - 1)
    : 0;
  const collapse = onStepRequest !== undefined && variant === "chips";

  return (
    <nav
      ref={ref}
      {...props}
      aria-label={`Step ${clamped + 1} of ${steps.length}: ${steps[clamped]}`}
      className={cn(className)}
    >
      {collapse ? (
        // aria-hidden: the nav's accessible name already says this (SC 1.3.1, no duplicate).
        <p aria-hidden="true" className="mb-1 text-xs font-medium text-muted-foreground sm:hidden">
          {`Step ${clamped + 1} of ${steps.length}`}
        </p>
      ) : null}
      <ol
        className={cn(
          "flex items-center gap-2",
          variant === "chips" && "flex-wrap",
        )}
      >
        {steps.map((label, index) => {
          const state = stateOf(index, clamped);
          const requestable =
            onStepRequest !== undefined &&
            state !== "current" &&
            (state === "completed" || isStepAllowed?.(index) === true);
          return (
            <StepperItem
              key={index}
              label={label}
              index={index}
              state={state}
              variant={variant}
              onRequest={requestable ? () => onStepRequest(index) : undefined}
            />
          );
        })}
      </ol>
    </nav>
  );
});
