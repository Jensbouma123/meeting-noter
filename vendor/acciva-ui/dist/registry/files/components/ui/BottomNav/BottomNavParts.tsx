import { cn } from "@/lib/utils";
import { ITEM_CLASS, LABEL_CLASS } from "@/components/ui/BottomNav/BottomNavClasses";
import type { BottomNavItem } from "@/components/ui/BottomNav/BottomNavTypes";

export function BottomNavItemView({ item }: { item: BottomNavItem }) {
  const itemClassName = cn(
    ITEM_CLASS,
    item.current ? "text-foreground" : "text-muted-foreground hover:text-foreground active:text-foreground",
  );
  const content = (
    <>
      <span aria-hidden="true" className="flex shrink-0 justify-center">
        {item.icon}
      </span>
      <span className={LABEL_CLASS}>{item.label}</span>
    </>
  );

  return (
    <li className="min-w-0 flex-1">
      {item.href === undefined ? (
        <button
          type="button"
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.current ? "page" : undefined}
          aria-expanded={item.expanded}
          aria-controls={item.controls}
          className={itemClassName}
        >
          {content}
        </button>
      ) : (
        <a
          href={item.href}
          aria-label={item.label}
          aria-current={item.current ? "page" : undefined}
          className={itemClassName}
        >
          {content}
        </a>
      )}
    </li>
  );
}
