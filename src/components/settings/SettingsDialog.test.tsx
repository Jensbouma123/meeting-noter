// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageContext } from "@/lib/i18n/LanguageContext";
import { installViewport, VIEWPORTS } from "@/test/viewport";
import { SettingsDialog } from "./SettingsDialog";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ||= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ||= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function renderDialog() {
  return render(
    <LanguageContext.Provider value="en">
      <SettingsDialog
        open
        onClose={vi.fn()}
        activeSection="general"
        onSectionChange={vi.fn()}
      >
        <p>content</p>
      </SettingsDialog>
    </LanguageContext.Provider>,
  );
}

describe("SettingsDialog on phone", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installViewport(VIEWPORTS.phone);
  });

  afterEach(() => {
    cleanup();
    restore();
  });

  it("lays the section tabs out as a horizontally scrolling row", () => {
    renderDialog();
    const tablist = screen.getByRole("tablist");
    expect(tablist).not.toHaveAttribute("aria-orientation", "vertical");
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.className).toContain("shrink-0");
    }
  });

  it("keeps the dialog padding and width caps for phone widths", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-sm:p-4");
    expect(dialog.className).toContain("!max-w-[calc(100vw-2rem)]");
  });
});

describe("SettingsDialog on desktop", () => {
  let restore: () => void;

  beforeEach(() => {
    restore = installViewport(VIEWPORTS.desktop);
  });

  afterEach(() => {
    cleanup();
    restore();
  });

  it("shows the section tabs as a vertical sidebar", () => {
    renderDialog();
    expect(screen.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
  });
});
