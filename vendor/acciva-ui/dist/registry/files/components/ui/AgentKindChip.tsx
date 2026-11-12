import { CodeXml, Diamond, Hexagon, PersonStanding, Plane, Sparkles, SquareFunction, type LucideIcon } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge/index";
import { cn } from "@/lib/utils";

export type AgentKind = "claude" | "pi" | "opencode" | "agy" | "codex" | "hermes" | "copilot";
export type AgentKindChipSize = "xs" | "sm" | "md";

export interface AgentKindChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onSelect"> {
  kind: AgentKind;
  display?: "label" | "glyph";
  size?: AgentKindChipSize;
  /** `glyph` only — hides it when an adjacent element already states the agent name. */
  decorative?: boolean;
}

const AGENT_KINDS: Record<AgentKind, { name: string; Icon: LucideIcon }> = {
  claude: { name: "Claude Code", Icon: Sparkles },
  pi: { name: "Pi", Icon: SquareFunction },
  opencode: { name: "OpenCode", Icon: CodeXml },
  agy: { name: "Agy (Gemini)", Icon: Diamond },
  codex: { name: "Codex", Icon: Hexagon },
  hermes: { name: "Hermes", Icon: PersonStanding },
  copilot: { name: "GitHub Copilot", Icon: Plane },
};

const GLYPH_DISC_CLASS: Record<AgentKindChipSize, string> = {
  xs: "size-5",
  sm: "size-6",
  md: "size-8",
};

const GLYPH_ICON_CLASS: Record<AgentKindChipSize, string> = {
  xs: "size-3",
  sm: "size-3.5",
  md: "size-4",
};

export function AgentKindChip({
  kind,
  display = "label",
  size = "sm",
  decorative = false,
  className,
  ...props
}: AgentKindChipProps) {
  const { name, Icon } = AGENT_KINDS[kind];

  if (display === "glyph") {
    return (
      <Avatar
        size="sm"
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": name })}
        {...props}
        className={cn(GLYPH_DISC_CLASS[size], className)}
        fallback={<Icon aria-hidden="true" className={GLYPH_ICON_CLASS[size]} />}
      />
    );
  }

  return (
    <Badge variant="neutral" size={size} className={cn("shrink-0 whitespace-nowrap", className)} {...props}>
      <Icon aria-hidden="true" />
      {name}
    </Badge>
  );
}
