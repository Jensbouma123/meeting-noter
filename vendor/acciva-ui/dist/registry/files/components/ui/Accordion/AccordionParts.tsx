"use client";

import { ChevronDown } from "lucide-react";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CONTENT_CHROME, ITEM_CHROME, TRIGGER_CHROME } from "@/components/ui/Accordion/AccordionChrome";
import { useAccordionContext } from "@/components/ui/Accordion/AccordionContext";

interface AccordionItemContextValue {
  value: string;
  isExpanded: boolean;
  triggerId: string;
  contentId: string;
  disabled: boolean;
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(null);

function useAccordionItemContext(component: string): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (!ctx) {
    throw new Error(`<${component}> must be used within <AccordionItem>`);
  }
  return ctx;
}

export interface AccordionItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  children: ReactNode;
}

export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(function AccordionItem(
  { value, disabled = false, className, children, ...props },
  ref,
) {
  const { expandedValues, variant } = useAccordionContext("AccordionItem");
  const isExpanded = expandedValues.has(value);
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const contentId = `${baseId}-content`;

  return (
    <AccordionItemContext.Provider value={{ value, isExpanded, triggerId, contentId, disabled }}>
      <div ref={ref} className={cn(ITEM_CHROME[variant], className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
});

export interface AccordionTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Optional slot after the label (e.g. a spinner or count). Rendered before the chevron by `default`, at the row end by `plain`. */
  trailing?: ReactNode;
}

export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(function AccordionTrigger(
  { className, children, trailing, ...props },
  ref,
) {
  const { toggleValue, variant } = useAccordionContext("AccordionTrigger");
  const { value, isExpanded, triggerId, contentId, disabled } = useAccordionItemContext("AccordionTrigger");
  const plain = variant === "plain";

  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground transition-transform motion-feedback", isExpanded && "rotate-180")}
    />
  );

  return (
    <h3 className="flex">
      <button
        ref={ref}
        id={triggerId}
        type="button"
        data-accordion-trigger="true"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        disabled={disabled}
        onClick={() => toggleValue(value)}
        className={cn(
          "focus-ring flex w-full items-center text-left text-sm font-semibold text-foreground transition-colors",
          TRIGGER_CHROME[variant],
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        {...props}
      >
        {plain && chevron}
        <span className={cn(plain && "flex-1")}>{children}</span>
        {trailing}
        {!plain && chevron}
      </button>
    </h3>
  );
});

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(function AccordionContent(
  { className, children, ...props },
  ref,
) {
  const { isExpanded, triggerId, contentId } = useAccordionItemContext("AccordionContent");
  const { variant } = useAccordionContext("AccordionContent");

  return (
    <div
      ref={ref}
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      hidden={!isExpanded}
      className={cn(
        "overflow-hidden transition-all motion-spatial",
        isExpanded ? "animate-fade-in block" : "hidden",
        className,
      )}
      {...props}
    >
      <div className={cn(CONTENT_CHROME[variant], "text-sm text-foreground")}>{children}</div>
    </div>
  );
});
