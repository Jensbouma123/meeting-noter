"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { TEXT_SIZE } from "@/lib/sizing-tokens/index";
import { cn } from "@/lib/utils";

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    return <div ref={ref} role="separator" aria-orientation="horizontal" className={cn("-mx-1 my-1 h-px bg-border/80", className)} {...props} />;
  },
);

export const DropdownMenuLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuLabel({ className, children, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="presentation"
        className={cn("px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

export function DropdownMenuShortcut({ className, children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn("ml-auto shrink-0 font-sans tracking-wide text-muted-foreground", TEXT_SIZE.xs, className)}
      {...props}
    >
      {children}
    </kbd>
  );
}

export const DropdownMenuGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function DropdownMenuGroup({ className, children, ...props }, ref) {
    return (
      <div ref={ref} role="group" className={cn("space-y-0.5", className)} {...props}>
        {children}
      </div>
    );
  },
);
