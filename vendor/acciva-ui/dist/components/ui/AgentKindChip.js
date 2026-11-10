import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CodeXml, Diamond, Hexagon, PersonStanding, Plane, Sparkles, SquareFunction } from "lucide-react";
import { Avatar } from "./Avatar.js";
import { Badge } from "./Badge/index.js";
import { cn } from "../../lib/utils.js";
const AGENT_KINDS = {
    claude: { name: "Claude Code", Icon: Sparkles },
    pi: { name: "Pi", Icon: SquareFunction },
    opencode: { name: "OpenCode", Icon: CodeXml },
    agy: { name: "Agy (Gemini)", Icon: Diamond },
    codex: { name: "Codex", Icon: Hexagon },
    hermes: { name: "Hermes", Icon: PersonStanding },
    copilot: { name: "GitHub Copilot", Icon: Plane },
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
export function AgentKindChip({ kind, display = "label", size = "sm", decorative = false, className, ...props }) {
    const { name, Icon } = AGENT_KINDS[kind];
    if (display === "glyph") {
        return (_jsx(Avatar, { size: "sm", ...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name }), ...props, className: cn(GLYPH_DISC_CLASS[size], className), fallback: _jsx(Icon, { "aria-hidden": "true", className: GLYPH_ICON_CLASS[size] }) }));
    }
    return (_jsxs(Badge, { variant: "neutral", size: size, className: cn("shrink-0 whitespace-nowrap", className), ...props, children: [_jsx(Icon, { "aria-hidden": "true" }), name] }));
}
