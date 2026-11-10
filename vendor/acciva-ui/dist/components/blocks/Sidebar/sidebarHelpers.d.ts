import type { ComponentType } from "react";
import type { SidebarIcon, SidebarItem } from "./SidebarTypes.js";
export declare function resolveActive(pathname: string | null, item: SidebarItem): boolean | undefined;
/**
 * A plain function or class is a component reference outright. `lucide-react` (and
 * many other icon sets) ship `forwardRef`/`memo`-wrapped components instead, which are
 * objects carrying a `$$typeof` tag rather than functions — an already-rendered
 * element carries the same shape of tag (`Symbol.for("react.element")`), so only these
 * two tags count as "a component to invoke", everything else is treated as a node.
 */
export declare function isIconComponent(icon: SidebarIcon): icon is ComponentType<{
    className?: string;
}>;
