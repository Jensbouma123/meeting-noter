"use client";

import { Bot } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from "@jensbouma123/acciva-ui";
import { AssistantLogo } from "@/components/settings/AssistantLogo";
import { loadConfiguredAssistants } from "@/lib/ask-assistant/configuredAssistantsStore";
import { useT } from "@/lib/i18n/useT";
import { AskAssistantPicker } from "./AskAssistantPicker";
import { AskPresetRows } from "./AskPresetRows";
import { SEGMENT_CLASS } from "./askAssistantStyles";
import type { AskAssistantMenuProps } from "./AskAssistantMenu.types";

const MENU_GAP_PX = 8;

export function AskAssistantMenu({
  assistant,
  configuredIds,
  loaded,
  hasTranscript,
  onPreset,
  onCustom,
  onOpenSettings,
}: AskAssistantMenuProps) {
  const t = useT("ask");
  const label = t("ask");
  const tip = !assistant
    ? t("setupTip")
    : hasTranscript
      ? t("askTip").replace("{name}", assistant.name)
      : t("noTranscript");

  return (
    <DropdownMenu
      onOpenChange={(open) => open && void loadConfiguredAssistants()}
    >
      <Tooltip content={tip}>
        <span className="inline-flex">
          <DropdownMenuTrigger>
            <button
              type="button"
              aria-label={label}
              disabled={!loaded}
              className={`${SEGMENT_CLASS} rounded-full px-3 text-sm font-medium`}
            >
              {assistant ? (
                <AssistantLogo id={assistant.id} size={20} />
              ) : (
                <Bot
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className="hidden sm:inline">{label}</span>
            </button>
          </DropdownMenuTrigger>
        </span>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={MENU_GAP_PX}
        className="mic-menu w-80 max-w-[calc(100vw-2rem)] p-1.5"
      >
        <DropdownMenuLabel>{t("assistantHeading")}</DropdownMenuLabel>
        <AskAssistantPicker
          assistantId={assistant?.id ?? null}
          configuredIds={configuredIds}
          onOpenSettings={onOpenSettings}
        />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("promptHeading")}</DropdownMenuLabel>
        <AskPresetRows
          hasTranscript={hasTranscript && assistant !== null}
          onPreset={onPreset}
          onCustom={onCustom}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
