import type {
  AssistantCatalogEntry,
  AssistantId,
  AssistantKind,
  AssistantVendor,
  CliAssistant,
} from "./types";

export const ASSISTANT_CATALOG: Readonly<
  Record<AssistantId, AssistantCatalogEntry>
> = {
  "claude-desktop": { vendor: "anthropic", kind: "app" },
  "claude-code": { vendor: "anthropic", kind: "cli" },
  "codex-app": { vendor: "openai", kind: "app" },
  codex: { vendor: "openai", kind: "cli" },
  "gemini-app": { vendor: "google", kind: "app" },
  agy: { vendor: "google", kind: "cli" },
};

export const VENDOR_ORDER: readonly AssistantVendor[] = [
  "anthropic",
  "openai",
  "google",
];

export const VENDOR_NAMES: Readonly<Record<AssistantVendor, string>> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export function assistantKind(id: AssistantId): AssistantKind {
  return ASSISTANT_CATALOG[id].kind;
}

export function isCliAssistant(id: AssistantId): id is CliAssistant {
  return assistantKind(id) === "cli";
}

export function groupByVendor<T extends AssistantId>(
  ids: readonly T[],
): { vendor: AssistantVendor; ids: T[] }[] {
  return VENDOR_ORDER.map((vendor) => ({
    vendor,
    ids: ids.filter((id) => ASSISTANT_CATALOG[id].vendor === vendor),
  })).filter((group) => group.ids.length > 0);
}
