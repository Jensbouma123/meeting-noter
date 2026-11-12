import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/Button/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu/index";
import type { SidebarIcon } from "@/components/blocks/Sidebar/SidebarTypes";
import { isIconComponent } from "@/components/blocks/Sidebar/sidebarHelpers";

/**
 * `display: contents` keeps the wrapper out of the box model, so a caller-supplied
 * component gets the exact size classes the rail/drawer applies while an
 * already-rendered node keeps its own — both stay `aria-hidden` since the link's own
 * `aria-label`/text carries the accessible name.
 */
export function SidebarGlyph({ icon, className }: { icon: SidebarIcon; className: string }) {
  if (isIconComponent(icon)) {
    const Icon = icon;
    return (
      <span aria-hidden="true" className="contents">
        <Icon className={className} />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className="contents">
      {icon}
    </span>
  );
}

/**
 * Per-row reorder menu. Move up / Move down are rendered only where they apply, so the
 * first row has no Move up and the last row no Move down (as AccivaSidebar does).
 */
export function SidebarReorderMenu({
  label,
  index,
  total,
  onMove,
}: {
  label: string;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" iconOnly tooltip={`Reorder ${label}`} className="shrink-0">
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {index > 0 && (
          <DropdownMenuItem icon={<ArrowUp className="size-4" />} onClick={() => onMove(index, index - 1)}>
            Move up
          </DropdownMenuItem>
        )}
        {index < total - 1 && (
          <DropdownMenuItem icon={<ArrowDown className="size-4" />} onClick={() => onMove(index, index + 1)}>
            Move down
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
