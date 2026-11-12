import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button/index";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu/index";
import type { DataListRowAction } from "@/components/ui/DataList/types";

interface DataListRowChromeProps<T> {
  item: T;
  index: number;
  total: number;
  content: ReactNode;
  actions: DataListRowAction<T>[];
  canReorder: boolean;
  label: string;
  onMove: (from: number, to: number) => void;
}

export function DataListRowChrome<T>({
  item,
  index,
  total,
  content,
  actions,
  canReorder,
  label,
  onMove,
}: DataListRowChromeProps<T>) {
  return (
    <div className="flex w-full items-start gap-2">
      <div className="min-w-0 flex-1">{content}</div>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            tooltip={label}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          >
            <Ellipsis className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              variant={action.destructive ? "danger" : "default"}
              icon={action.icon}
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                action.onSelect(item, index);
              }}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
          {canReorder && actions.length > 0 && <DropdownMenuSeparator />}
          {canReorder && (
            <>
              <DropdownMenuItem
                icon={<ArrowUp className="size-4" />}
                disabled={index <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(index, index - 1);
                }}
              >
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem
                icon={<ArrowDown className="size-4" />}
                disabled={index >= total - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(index, index + 1);
                }}
              >
                Move down
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
