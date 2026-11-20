"use client";

import { useT } from "@/lib/i18n/useT";
import type { AssistantKindTagProps } from "./Assistant.types";

export function AssistantKindTag({ kind }: AssistantKindTagProps) {
  const t = useT("assistant");
  return (
    <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] leading-none font-semibold tracking-wide text-muted-foreground uppercase">
      {t(`kind.${kind}`)}
    </span>
  );
}
