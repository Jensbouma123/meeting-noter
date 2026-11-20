import { cleanup, render } from "@testing-library/react";
import { vi } from "vitest";
import { LanguageContext } from "@/lib/i18n/LanguageContext";
import { AssistantSection } from "./AssistantSection";

export const LIST = {
  assistants: [
    {
      id: "claude-desktop",
      status: "not-connected",
      canAutoConnect: true,
      manualCommand: null,
      configPath: "/cfg.json",
    },
    {
      id: "claude-code",
      status: "connected",
      canAutoConnect: false,
      manualCommand: null,
      configPath: null,
    },
    {
      id: "codex",
      status: "not-connected",
      canAutoConnect: false,
      manualCommand: "codex mcp add x",
      configPath: null,
    },
  ],
};

export function mockFetch(
  handler: (url: string, init?: RequestInit) => unknown,
) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => ({
    ok: true,
    json: async () => handler(url, init),
  }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

export function renderSection(language: "en" | "nl" = "en") {
  return render(
    <LanguageContext.Provider value={language}>
      <AssistantSection />
    </LanguageContext.Provider>,
  );
}

export function resetRenderedSection(): void {
  cleanup();
  vi.unstubAllGlobals();
}
