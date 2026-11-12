import { Search } from "lucide-react";
import { createElement } from "react";
import { HStack } from "@/components/ui/HStack";
import { getIconComponent, type IconCategory } from "@/lib/icon-registry";
import { cn } from "@/lib/utils";
import { CATEGORY_OPTIONS } from "@/components/ui/IconPicker/constants";

export function SelectedIconPreview({ name }: { name: string }) {
  const Icon = getIconComponent(name);
  if (!Icon) return <Search className="size-4" aria-hidden="true" />;
  return createElement(Icon, { className: "size-4", "aria-hidden": true });
}

export function IconCategoryChips({
  category,
  onSelect,
}: {
  category: IconCategory | "All";
  onSelect: (option: IconCategory | "All") => void;
}) {
  return (
    <HStack align="stretch" wrap spacing="sm">
      {CATEGORY_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={category === option}
          onClick={() => onSelect(option)}
          className={cn(
            "focus-ring rounded-full px-3 py-1 text-xs font-medium transition-colors",
            category === option
              ? "bg-primary-600 text-button-primary-foreground font-semibold dark:bg-primary-500"
              : "bg-elevation-2 text-muted-foreground hover:bg-elevation-3 hover:text-foreground dark:hover:bg-elevation-4",
          )}
        >
          {option}
        </button>
      ))}
    </HStack>
  );
}

export function IconOptionButton({
  name,
  selected,
  tabIndex,
  onFocus,
  onClick,
}: {
  name: string;
  selected: boolean;
  tabIndex: number;
  onFocus: () => void;
  onClick: () => void;
}) {
  const Icon = getIconComponent(name);
  if (!Icon) return null;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={name}
      title={name}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onClick={onClick}
      className={cn(
        "focus-ring flex aspect-square items-center justify-center rounded-md transition-colors",
        selected
          ? "bg-primary-600 text-button-primary-foreground shadow-xs dark:bg-primary-500"
          : "text-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4",
      )}
    >
      {createElement(Icon, { className: "size-4", "aria-hidden": true })}
    </button>
  );
}
