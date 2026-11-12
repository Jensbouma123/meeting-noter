import type { ComponentType } from "react";
import type { SidebarIcon, SidebarItem } from "@/components/blocks/Sidebar/SidebarTypes";

function matchesPathname(pathname: string | null, href: string) {
  return pathname === href || (href !== "/" && pathname?.startsWith(href));
}

export function resolveActive(pathname: string | null, item: SidebarItem) {
  return item.isActive ?? matchesPathname(pathname, item.href);
}

const REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
const REACT_MEMO_TYPE = Symbol.for("react.memo");

/**
 * A plain function or class is a component reference outright. `lucide-react` (and
 * many other icon sets) ship `forwardRef`/`memo`-wrapped components instead, which are
 * objects carrying a `$$typeof` tag rather than functions — an already-rendered
 * element carries the same shape of tag (`Symbol.for("react.element")`), so only these
 * two tags count as "a component to invoke", everything else is treated as a node.
 */
export function isIconComponent(icon: SidebarIcon): icon is ComponentType<{ className?: string }> {
  if (typeof icon === "function") return true;
  if (typeof icon === "object" && icon !== null && "$$typeof" in icon) {
    const type = (icon as { $$typeof?: symbol }).$$typeof;
    return type === REACT_FORWARD_REF_TYPE || type === REACT_MEMO_TYPE;
  }
  return false;
}
