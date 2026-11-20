"use client";

import { useState } from "react";
import { presetInstruction } from "@/lib/ask-assistant";
import { AskAssistantMenu } from "./AskAssistantMenu";
import { CustomQuestionDialog } from "./CustomQuestionDialog";
import { useAskAssistant } from "./useAskAssistant";
import type { AskAssistantButtonProps } from "./AskAssistantButton.types";

export function AskAssistantButton({
  onOpenSettings,
  ...input
}: AskAssistantButtonProps) {
  const { assistant, configured, language, hasTranscript, ask } =
    useAskAssistant(input);
  const [customOpen, setCustomOpen] = useState(false);

  return (
    <div className="inline-flex shrink-0 items-center">
      <AskAssistantMenu
        assistant={assistant}
        configuredIds={configured.ids}
        loaded={configured.loaded}
        hasTranscript={hasTranscript}
        onPreset={(preset) => void ask(presetInstruction(preset, language))}
        onCustom={() => setCustomOpen(true)}
        onOpenSettings={onOpenSettings}
      />
      <CustomQuestionDialog
        open={customOpen}
        assistantName={assistant?.name ?? ""}
        onClose={() => setCustomOpen(false)}
        onSubmit={(question) => {
          setCustomOpen(false);
          void ask(question);
        }}
      />
    </div>
  );
}
