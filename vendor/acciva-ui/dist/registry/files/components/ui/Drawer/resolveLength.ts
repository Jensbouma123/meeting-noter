import type { DrawerAxis, DrawerLength } from "@/components/ui/Drawer/types";

export function resolveLength(
  value: DrawerLength,
  referenceEl: HTMLElement | null,
  axis: DrawerAxis = "vertical",
): number {
  if (typeof value === "number") return value;
  const horizontal = axis === "horizontal";
  const viewport = typeof window === "undefined" ? 0 : horizontal ? window.innerWidth : window.innerHeight;

  if (typeof value === "string") {
    if (value.endsWith("px")) {
      const parsed = parseFloat(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    if (value.endsWith("%")) {
      const pct = parseFloat(value);
      if (!Number.isNaN(pct)) {
        const rect = referenceEl?.getBoundingClientRect();
        const refSize = (horizontal ? rect?.width : rect?.height) || viewport;
        if (refSize > 0) return (refSize * pct) / 100;
      }
    }
    if (/(?:d|s|l)?vh$/.test(value) || /(?:d|s|l)?vw$/.test(value)) {
      const units = parseFloat(value);
      const basis = /vw$/.test(value)
        ? typeof window === "undefined"
          ? 0
          : window.innerWidth
        : typeof window === "undefined"
          ? 0
          : window.innerHeight;
      if (!Number.isNaN(units) && basis > 0) return (basis * units) / 100;
    }
  }

  if (typeof document === "undefined" || !referenceEl) return 0;
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.width = horizontal ? value : "0";
  probe.style.height = horizontal ? "0" : value;
  referenceEl.appendChild(probe);
  const rect = probe.getBoundingClientRect();
  const px = horizontal ? rect.width : rect.height;
  referenceEl.removeChild(probe);
  return px;
}
