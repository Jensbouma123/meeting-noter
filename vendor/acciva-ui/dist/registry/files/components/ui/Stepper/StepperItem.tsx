import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "completed" | "current" | "upcoming";

const dotClasses: Record<StepState, string> = {
  // Solid brand fill: brand-foreground is a text-role colour, so it clears 3:1 (SC 1.4.11).
  completed: "bg-brand-foreground",
  // Larger than the other dots, so the current step is not colour-only (SC 1.4.1).
  current: "size-2.5 bg-brand-foreground",
  // Hollow ring in full-opacity muted-foreground: shape, not colour, tells it apart.
  upcoming: "border-2 border-muted-foreground",
};

const chipClasses: Record<StepState, string> = {
  completed: "border-border bg-surface text-foreground",
  current: "border-brand-foreground bg-brand-foreground/10 font-semibold text-foreground",
  upcoming: "border-border text-muted-foreground",
};

export function stateOf(index: number, current: number): StepState {
  if (index < current) return "completed";
  if (index === current) return "current";
  return "upcoming";
}

interface StepperItemProps {
  label: string;
  index: number;
  state: StepState;
  variant: "dots" | "chips";
  /** Set when the step is requestable: renders a real button instead of static content. */
  onRequest?: () => void;
}

const suffix = (state: StepState) =>
  state === "completed" ? " (completed)" : state === "current" ? " (current step)" : "";

export function StepperItem({ label, index, state, variant, onRequest }: StepperItemProps) {
  const isCurrent = state === "current";
  const body =
    variant === "dots" ? (
      <>
        <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dotClasses[state])} />
        <span className="sr-only">{`Step ${index + 1}: ${label}${suffix(state)}`}</span>
      </>
    ) : (
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
        {state !== "upcoming" ? <span className="sr-only">{suffix(state)}</span> : null}
      </span>
    );
  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      className={cn("inline-flex items-center", variant === "chips" && "min-w-0")}
    >
      {onRequest ? (
        // Button, not a div: native Enter/Space + focus (SC 2.1.1); 24px floor (SC 2.5.8).
        <button
          type="button"
          onClick={onRequest}
          className="focus-ring motion-feedback inline-flex min-h-6 min-w-6 items-center justify-center rounded-full hover:opacity-80"
        >
          {body}
        </button>
      ) : (
        body
      )}
    </li>
  );
}
