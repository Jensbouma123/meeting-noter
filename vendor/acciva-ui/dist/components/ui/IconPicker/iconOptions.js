import { createElement } from "react";
import { ALL_ICON_NAMES, getIconComponent } from "../../../lib/icon-registry.js";
let iconOptionsCache = null;
/** Builds the full registry option list once; the glyph elements are reused across mounts and keystrokes. */
export function getIconOptions() {
    iconOptionsCache ?? (iconOptionsCache = ALL_ICON_NAMES.map((entry) => {
        const Icon = getIconComponent(entry.name);
        return {
            value: entry.name,
            label: entry.name,
            icon: Icon ? createElement(Icon, { className: "size-4", "aria-hidden": true }) : undefined,
        };
    }));
    return iconOptionsCache;
}
