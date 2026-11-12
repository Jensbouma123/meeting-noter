"use client";

import { Check } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useDropdownMenuContext } from "@/components/ui/DropdownMenu/DropdownMenuContext";

export type DropdownMenuItemVariant = "default" | "danger";

export interface DropdownMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `"danger"` is the same destructive tone `Button`, `Badge` and `Alert` use. */
  variant?: DropdownMenuItemVariant;
  /**
   * @deprecated Use `variant="danger"`. Kept working so no caller breaks; it
   * loses to `variant` when both are set and will be removed in a future major.
   */
  destructive?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const MENU_ITEM_TONE: Record<DropdownMenuItemVariant, string> = {
  default:
    "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20",
  danger: "text-danger hover:bg-danger/10 focus-visible:bg-danger/10 active:bg-danger/15",
};

const MENU_ITEM_ICON_TONE: Record<DropdownMenuItemVariant, string> = {
  default: "text-muted-foreground group-hover:text-current",
  danger: "text-danger",
};

export const DropdownMenuItem = forwardRef<HTMLButtonElement, DropdownMenuItemProps>(function DropdownMenuItem(
  { variant, destructive = false, icon, className, children, onClick, disabled, ...props },
  ref,
) {
  const resolvedVariant: DropdownMenuItemVariant = variant ?? (destructive ? "danger" : "default");
  const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuItem");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      onClick={handleClick}
      className={cn(
        "group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none",
        MENU_ITEM_TONE[resolvedVariant],
        disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent",
        className,
      )}
      {...props}
    >
      {icon ? (
        <span aria-hidden="true" className={cn("size-4 shrink-0", MENU_ITEM_ICON_TONE[resolvedVariant])}>
          {icon}
        </span>
      ) : null}
      <span className="flex flex-1 items-center gap-4 text-left">{children}</span>
    </button>
  );
});

export interface DropdownMenuCheckboxItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}

export const DropdownMenuCheckboxItem = forwardRef<HTMLButtonElement, DropdownMenuCheckboxItemProps>(
  function DropdownMenuCheckboxItem({ checked, onCheckedChange, className, children, disabled, ...props }, ref) {
    const { setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuCheckboxItem");

    const handleClick = () => {
      if (disabled) return;
      onCheckedChange(!checked);
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };

    return (
      <button
        ref={ref}
        type="button"
        role="menuitemcheckbox"
        aria-checked={checked}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        tabIndex={-1}
        onClick={handleClick}
        className={cn(
          "group relative flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none",
          "text-foreground hover:bg-primary-500/10 focus-visible:bg-primary-500/10 active:bg-primary-500/15 dark:hover:bg-primary-400/20 dark:focus-visible:bg-primary-400/20",
          disabled && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent",
          className,
        )}
        {...props}
      >
        <span className="flex size-4 shrink-0 items-center justify-center">
          {checked ? <Check className="size-4 text-primary-600 dark:text-primary-400" /> : null}
        </span>
        <span className="flex flex-1 items-center gap-4 text-left">{children}</span>
      </button>
    );
  },
);
