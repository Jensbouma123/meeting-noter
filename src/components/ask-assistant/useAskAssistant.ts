"use client";

import { useSyncExternalStore } from "react";
import { useToast } from "@jensbouma123/acciva-ui";
import { ASSISTANT_NAMES } from "@/components/settings/AssistantNames";
import {
  buildAskPrompt,
  deliverPrompt,
  getAskAssistant,
  launchAppLink,
  pickAskAssistant,
  requestServerLaunch,
} from "@/lib/ask-assistant";
import {
  getConfiguredAssistants,
  getServerConfiguredAssistants,
  subscribeConfiguredAssistants,
} from "@/lib/ask-assistant/configuredAssistantsStore";
import {
  getLastAssistant,
  getServerLastAssistant,
  subscribeLastAssistant,
} from "@/lib/ask-assistant/lastAssistantStore";
import { useLanguage } from "@/lib/i18n/useLanguage";
import { useT } from "@/lib/i18n/useT";
import { copyToClipboard } from "@/lib/meeting/export-browser";
import {
  finalSegments,
  resolveSpeakerLabel,
} from "@/lib/meeting/transcript-format";
import type { UseAskAssistantInput } from "./useAskAssistant.types";

export function useAskAssistant({
  title,
  startedAt,
  segments,
  speakers,
}: UseAskAssistantInput) {
  const t = useT("ask");
  const language = useLanguage();
  const { toast } = useToast();
  const configured = useSyncExternalStore(
    subscribeConfiguredAssistants,
    getConfiguredAssistants,
    getServerConfiguredAssistants,
  );
  const storedId = useSyncExternalStore(
    subscribeLastAssistant,
    getLastAssistant,
    getServerLastAssistant,
  );
  const assistantId = pickAskAssistant(storedId, configured.ids);
  const assistant = assistantId
    ? { id: assistantId, name: ASSISTANT_NAMES[assistantId] }
    : null;
  const finals = finalSegments(segments);
  const hasTranscript = finals.length > 0;

  const ask = async (instruction: string) => {
    if (!assistant) return;
    const turns = finals.map((seg) => ({
      speaker: resolveSpeakerLabel(seg, speakers),
      text: seg.text,
    }));
    const dateLabel = startedAt
      ? new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(
          startedAt,
        )
      : "";
    const prompt = buildAskPrompt({
      instruction,
      title,
      dateLabel,
      turns,
      language,
    });
    const outcome = await deliverPrompt(getAskAssistant(assistant.id), prompt, {
      copy: copyToClipboard,
      launchApp: (appUrl, webUrl) => launchAppLink(appUrl, webUrl),
      openWeb: (url) => void window.open(url, "_blank", "noopener,noreferrer"),
      requestLaunch: requestServerLaunch,
    });
    const fill = (message: string) => message.replace("{name}", assistant.name);
    if (outcome === "opened") toast.success(fill(t("opened")));
    else if (outcome === "copied") toast.success(fill(t("copiedPaste")));
    else toast.danger(fill(t("copyFailed")));
  };

  return { assistant, configured, language, hasTranscript, ask };
}
