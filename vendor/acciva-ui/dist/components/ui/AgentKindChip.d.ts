import type { HTMLAttributes } from "react";
export type AgentKind = "claude" | "pi" | "opencode" | "agy" | "codex" | "hermes";
export type AgentKindChipSize = "xs" | "sm" | "md";
export interface AgentKindChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "onSelect"> {
    kind: AgentKind;
    display?: "label" | "glyph";
    size?: AgentKindChipSize;
    /** `glyph` only — hides it when an adjacent element already states the agent name. */
    decorative?: boolean;
}
export declare function AgentKindChip({ kind, display, size, decorative, className, ...props }: AgentKindChipProps): import("react").JSX.Element;
