import { ArrowBigUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { HStack } from "@/components/ui/HStack";
import { VStack } from "@/components/ui/VStack";
import type { PasswordStrength } from "@/components/ui/PasswordField/types";

const STRENGTH_COLORS: Record<number, string> = {
  1: "bg-danger",
  2: "bg-warning",
  3: "bg-info",
  4: "bg-success",
};

/** Always mounted so screen readers catch the text when it appears; collapsed while inactive. */
export function CapsLockNotice({ active }: { active: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={active ? "flex items-center gap-1.5 text-xs font-medium text-warning animate-fade-in" : "sr-only"}
    >
      {active ? (
        <>
          <ArrowBigUp className="size-3.5 shrink-0" aria-hidden="true" />
          <span>Caps Lock is on</span>
        </>
      ) : null}
    </div>
  );
}

export function StrengthMeter({ score, label }: Pick<PasswordStrength, "score" | "label">) {
  return (
    <VStack spacing="xs" className="mt-0.5">
      <div
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuetext={`Password strength: ${label}`}
        aria-label="Password strength"
        className="flex gap-2 h-1.5 w-full"
      >
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={cn(
              "h-full flex-1 rounded-full transition-colors motion-feedback",
              step <= score ? STRENGTH_COLORS[score] : "bg-muted-foreground/20",
            )}
          />
        ))}
      </div>
      <HStack
        align="stretch"
        justify="between"
        spacing="none"
        className="text-xs text-muted-foreground"
      >
        <span>Strength</span>
        <span className="font-medium text-foreground">{label}</span>
      </HStack>
    </VStack>
  );
}
