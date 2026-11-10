import type { NavTreeGroup } from "./NavTreeTypes.js";
export interface NavTreeGroupBlockProps {
    group: NavTreeGroup;
    activeHref?: string;
    isExpanded: boolean;
    onToggle: () => void;
}
export declare function NavTreeGroupBlock({ group, activeHref, isExpanded, onToggle }: NavTreeGroupBlockProps): import("react").JSX.Element;
