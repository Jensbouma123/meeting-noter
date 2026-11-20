import { siClaude, siGooglegemini } from "simple-icons";
import { SquareTerminal } from "lucide-react";
import { ASSISTANT_CATALOG } from "@/lib/assistants/catalog";
import type { AssistantLogoProps } from "./Assistant.types";
import { OPENAI_PATH } from "./AssistantLogoPaths";

const VENDOR_MARK = {
  anthropic: { path: siClaude.path, fill: `#${siClaude.hex}` },
  openai: { path: OPENAI_PATH, fill: "currentColor" },
  google: { path: siGooglegemini.path, fill: `#${siGooglegemini.hex}` },
} as const;

export function AssistantLogo({ id, size = 28 }: AssistantLogoProps) {
  const { vendor, kind } = ASSISTANT_CATALOG[id];
  const mark = VENDOR_MARK[vendor];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      data-testid={`assistant-logo-${id}`}
      className="shrink-0"
    >
      <path d={mark.path} fill={mark.fill} />
      {kind === "cli" && (
        <>
          <rect
            x="11"
            y="11"
            width="13"
            height="13"
            rx="3.5"
            fill="var(--background, #fff)"
          />
          <SquareTerminal
            x="12"
            y="12"
            width="11"
            height="11"
            strokeWidth={2.2}
            color="currentColor"
          />
        </>
      )}
    </svg>
  );
}
