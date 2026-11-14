"use client";

import { ChevronRight } from "lucide-react";
import { createContext, forwardRef, useContext, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_SEPARATOR = <ChevronRight className="size-3.5 text-muted-foreground" />;
const SeparatorContext = createContext<ReactNode>(DEFAULT_SEPARATOR);

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  separator?: ReactNode;
  children: ReactNode;
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  { separator = DEFAULT_SEPARATOR, className, children, ...props },
  ref,
) {
  return (
    <SeparatorContext.Provider value={separator}>
      <nav ref={ref} aria-label="Breadcrumb" className={cn("flex items-center text-sm text-muted-foreground", className)} {...props}>
        <ol className="flex flex-wrap items-center gap-2">{children}</ol>
      </nav>
    </SeparatorContext.Provider>
  );
});

export interface BreadcrumbItemProps extends HTMLAttributes<HTMLLIElement> {
  href?: string;
  isCurrent?: boolean;
  children: ReactNode;
}

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(function BreadcrumbItem(
  { href, isCurrent = false, className, children, ...props },
  ref,
) {
  return (
    <li ref={ref} className={cn("inline-flex items-center gap-2", className)} {...props}>
      {href && !isCurrent ? (
        <a
          href={href}
          className="focus-ring rounded font-medium text-muted-foreground transition-colors motion-feedback hover:text-foreground active:text-foreground active:underline"
        >
          {children}
        </a>
      ) : (
        <span
          aria-current={isCurrent ? "page" : undefined}
          className={cn("font-medium", isCurrent ? "text-foreground font-semibold" : "text-muted-foreground")}
        >
          {children}
        </span>
      )}
    </li>
  );
});

export function BreadcrumbSeparator({ children, className }: { children?: ReactNode; className?: string }) {
  const separator = useContext(SeparatorContext);
  return (
    <li aria-hidden="true" className={cn("inline-flex items-center shrink-0 opacity-70", className)}>
      {children ?? separator}
    </li>
  );
}
