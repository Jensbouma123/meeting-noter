import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TypingIndicatorSize = "sm" | "md" | "lg";

export interface TypingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  size?: TypingIndicatorSize;
}

const DOT_SIZE: Record<TypingIndicatorSize, string> = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

const DOT_GAP: Record<TypingIndicatorSize, string> = {
  sm: "gap-1",
  md: "gap-1",
  lg: "gap-1.5",
};

// Timing comes from `--motion-typing-cycle` / `--motion-typing-stagger` (src/styles/base.css),
// the same values `AccivaTokens.Motion.typingCycle` / `typingStagger` emit on Apple.
const DOT_COUNT = 3;

export const TypingIndicator = forwardRef<HTMLDivElement, TypingIndicatorProps>(function TypingIndicator(
  { label, size = "md", className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="status"
      className={cn("inline-flex items-center", DOT_GAP[size], className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: DOT_COUNT }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            animationDuration: "var(--motion-typing-cycle)",
            animationDelay: `calc(var(--motion-typing-stagger) * ${index})`,
          }}
          className={cn(
            // motion-reduce:opacity-60 is AccivaTokens.Opacity.typingStatic (TYPING_STATIC_OPACITY).
            "rounded-full bg-muted-foreground animate-pulse motion-reduce:animate-none motion-reduce:opacity-60",
            DOT_SIZE[size],
          )}
        />
      ))}
    </div>
  );
});
