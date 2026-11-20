// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS_SECTION,
  loadLastSettingsSection,
  resolveSettingsSection,
  saveLastSettingsSection,
} from "./sections";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("settings section memory", () => {
  it("lands on General on the first ever open", () => {
    expect(DEFAULT_SETTINGS_SECTION).toBe("general");
    expect(loadLastSettingsSection()).toBe("general");
  });

  it("reopens on the last section the user chose", () => {
    saveLastSettingsSection("about");
    expect(loadLastSettingsSection()).toBe("about");
  });

  it("maps the legacy speech-model value to advanced", () => {
    localStorage.setItem("mn.settings.section", "speech-model");
    expect(loadLastSettingsSection()).toBe("advanced");
  });

  it("falls back to General for an unknown stored value", () => {
    localStorage.setItem("mn.settings.section", "nonsense");
    expect(loadLastSettingsSection()).toBe("general");
  });
});

describe("resolveSettingsSection", () => {
  it.each([
    [null, "general"],
    ["", "general"],
    ["theme", "theme"],
    ["speech-model", "advanced"],
    ["missing", "general"],
  ] as const)("resolves %s to %s", (raw, expected) => {
    expect(resolveSettingsSection(raw)).toBe(expected);
  });
});
