var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CodeXml, Diamond, Hexagon, PersonStanding, Sparkles, SquareFunction } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar.js";
import { Badge } from "../../components/ui/Badge.js";
import { cn } from "../../lib/utils.js";
const AGENT_KINDS = {
    claude: { name: "Claude Code", Icon: Sparkles },
    pi: { name: "Pi", Icon: SquareFunction },
    opencode: { name: "OpenCode", Icon: CodeXml },
    agy: { name: "Agy (Gemini)", Icon: Diamond },
    codex: { name: "Codex", Icon: Hexagon },
    hermes: { name: "Hermes", Icon: PersonStanding },
};
const GLYPH_DISC_CLASS = {
    xs: "size-5",
    sm: "size-6",
    md: "size-8",
};
const GLYPH_ICON_CLASS = {
    xs: "size-3",
    sm: "size-3.5",
    md: "size-4",
};
export function AgentKindChip(_a) {
    var { kind, display = "label", size = "sm", decorative = false, className } = _a, props = __rest(_a, ["kind", "display", "size", "decorative", "className"]);
    const { name, Icon } = AGENT_KINDS[kind];
    if (display === "glyph") {
        return (_jsx(Avatar, Object.assign({ size: "sm" }, (decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name }), props, { className: cn(GLYPH_DISC_CLASS[size], className), fallback: _jsx(Icon, { "aria-hidden": "true", className: GLYPH_ICON_CLASS[size] }) })));
    }
    return (_jsxs(Badge, Object.assign({ variant: "neutral", size: size, className: cn("shrink-0 whitespace-nowrap", className) }, props, { children: [_jsx(Icon, { "aria-hidden": "true" }), name] })));
}
