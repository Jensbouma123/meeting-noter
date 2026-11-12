import { Menu, X } from "lucide-react";
import { HStack } from "@/components/ui/HStack";
import { cn } from "@/lib/utils";

interface NavHeaderMenuToggleProps {
  open: boolean;
  controls: string;
  onToggle: () => void;
}

export function NavHeaderMenuToggle({ open, controls, onToggle }: NavHeaderMenuToggleProps) {
  return (
    <HStack spacing="none">
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle primary navigation"
        aria-expanded={open}
        aria-controls={controls}
        className="touch-target-44 focus-ring flex size-9 items-center justify-center rounded-md text-foreground transition-colors motion-feedback hover:bg-elevation-3 active:bg-elevation-4 active:scale-[0.99] lg:hidden"
      >
        <span className="relative flex size-5 items-center justify-center" aria-hidden="true">
          <Menu
            className={cn(
              "absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none",
              open ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100",
            )}
          />
          <X
            className={cn(
              "absolute inset-0 size-5 transition-all motion-feedback motion-reduce:transition-none",
              open ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75",
            )}
          />
        </span>
      </button>
    </HStack>
  );
}
