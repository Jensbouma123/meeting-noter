import { Check } from "lucide-react";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type StepperVariant = "dots" | "chips";

export interface StepperProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Step labels in order. Empty renders nothing. Rendered verbatim, never as HTML. */
  steps: string[];
  /** Zero-based index of the current step. Clamped to `0..steps.length - 1`. */
  current: number;
  /** Compact dots or labelled pills. */
  variant?: StepperVariant;
}

const dotClasses: Record<"completed" | "current" | "upcoming", string> = {
  // Solid brand fill: brand-foreground is a text-role colour, so it clears 3:1 (SC 1.4.11).
  completed: "bg-brand-foreground",
  // Larger than the other dots, so the current step is not colour-only (SC 1.4.1).
  current: "size-2.5 bg-brand-foreground",
  // Hollow ring in full-opacity muted-foreground: shape, not colour, tells it apart.
  upcoming: "border-2 border-muted-foreground",
};

const chipClasses: Record<"completed" | "current" | "upcoming", string> = {
  completed: "border-border bg-surface text-foreground",
  current: "border-brand-foreground bg-brand-foreground/10 font-semibold text-foreground",
  upcoming: "border-border text-muted-foreground",
};

function stateOf(index: number, current: number): "completed" | "current" | "upcoming" {
  if (index < current) return "completed";
  if (index === current) return "current";
  return "upcoming";
}

export const Stepper = forwardRef<HTMLElement, StepperProps>(function Stepper(
  { steps, current, variant = "dots", className, ...props },
  ref,
) {
  if (steps.length === 0) return null;
  const clamped = Number.isFinite(current)
    ? Math.min(Math.max(Math.floor(current), 0), steps.length - 1)
    : 0;

  return (
    <nav
      ref={ref}
      {...props}
      aria-label={`Step ${clamped + 1} of ${steps.length}: ${steps[clamped]}`}
      className={cn(className)}
    >
      <ol className={cn("flex items-center", variant === "dots" ? "gap-2" : "flex-wrap gap-2")}>
        {steps.map((label, index) => {
          const state = stateOf(index, clamped);
          const isCurrent = index === clamped;
          if (variant === "dots") {
            return (
              <li key={index} aria-current={isCurrent ? "step" : undefined} className="inline-flex items-center">
                <span
                  aria-hidden="true"
                  className={cn("size-2 shrink-0 rounded-full", dotClasses[state])}
                />
                <span className="sr-only">
                  {`Step ${index + 1}: ${label}`}
                  {state === "completed" ? " (completed)" : isCurrent ? " (current step)" : ""}
                </span>
              </li>
            );
          }
          return (
            <li key={index} aria-current={isCurrent ? "step" : undefined} className="inline-flex min-w-0 items-center">
              <span
                className={cn(
                  "inline-flex max-w-40 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  chipClasses[state],
                )}
              >
                {state === "completed" ? (
                  <Check aria-hidden="true" className="size-3.5 shrink-0 text-success" strokeWidth={3} />
                ) : null}
                <span className="truncate">{label}</span>
                {state !== "upcoming" ? (
                  <span className="sr-only">{state === "completed" ? " (completed)" : " (current step)"}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
