import { ChevronRight } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  separator?: ReactNode;
  children: ReactNode;
}

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  { separator = <ChevronRight className="size-3.5 text-muted-foreground" />, className, children, ...props },
  ref,
) {
  return (
    <nav ref={ref} aria-label="Breadcrumb" className={cn("flex items-center text-sm text-muted-foreground", className)} {...props}>
      <ol className="flex flex-wrap items-center gap-2">{children}</ol>
    </nav>
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

export function BreadcrumbSeparator({ children = <ChevronRight className="size-3.5 text-muted-foreground" />, className }: { children?: ReactNode; className?: string }) {
  return (
    <li aria-hidden="true" className={cn("inline-flex items-center shrink-0 opacity-70", className)}>
      {children}
    </li>
  );
}
