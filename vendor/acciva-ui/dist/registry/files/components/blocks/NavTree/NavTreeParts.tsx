import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { HStack } from "@/components/ui/HStack";
import { ListItem } from "@/components/ui/ListItem";
import { Text } from "@/components/ui/Text";
import { VStack } from "@/components/ui/VStack";
import { cn } from "@/lib/utils";
import { groupDomId } from "@/components/blocks/NavTree/navTreeHelpers";
import type { NavTreeGroup } from "@/components/blocks/NavTree/NavTreeTypes";

export interface NavTreeGroupBlockProps {
  group: NavTreeGroup;
  activeHref?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

export function NavTreeGroupBlock({ group, activeHref, isExpanded, onToggle }: NavTreeGroupBlockProps) {
  const groupId = groupDomId(group.label);

  return (
    <VStack spacing="sm">
      <HStack spacing="sm" justify="between" className="pr-2">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={groupId}
          onClick={onToggle}
          className="focus-ring text-foreground flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold transition-colors motion-feedback hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4"
        >
          <Text as="span" size="sm" weight="semibold" truncate>
            {group.label}
          </Text>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>
        {group.count !== undefined && (
          <Text as="span" size="xxs" font="mono" variant="muted">
            {group.count}
          </Text>
        )}
      </HStack>

      <VStack
        id={groupId}
        hidden={!isExpanded}
        spacing="xs"
        className="ml-3 border-l border-border pl-3"
      >
        {group.items.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <VStack key={item.href} spacing="xs">
              <ListItem asChild title={item.label} selected={isActive}>
                <Link href={item.href}>{item.label}</Link>
              </ListItem>

              {item.children && item.children.length > 0 && (
                <VStack spacing="xs" className="ml-3 border-l border-border pl-3">
                  {item.children.map((child) => {
                    const isChildActive = child.href === activeHref;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        aria-current={isChildActive ? "page" : undefined}
                        className={cn(
                          "focus-ring block truncate rounded-lg px-3 py-2 text-xs font-normal transition-colors motion-feedback",
                          isChildActive
                            ? "bg-primary-500/15 text-primary-800 dark:text-primary-300 font-semibold"
                            : "text-muted-foreground hover:bg-elevation-2 active:bg-elevation-3 dark:hover:bg-elevation-3 dark:active:bg-elevation-4 hover:text-foreground active:text-foreground",
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </VStack>
              )}
            </VStack>
          );
        })}
      </VStack>
    </VStack>
  );
}
