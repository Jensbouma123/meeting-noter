import { useState } from "react";
import { parseColor, type RGBA } from "@/lib/color/formats/index";

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

export function useEyeDropper(enabled: boolean, onPick: (rgba: RGBA) => void) {
  const [EyeDropperApi] = useState(() =>
    enabled && typeof window !== "undefined"
      ? (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper
      : undefined,
  );

  const pickFromScreen = () => {
    if (!EyeDropperApi) return;
    new EyeDropperApi()
      .open()
      .then(({ sRGBHex }) => {
        const picked = parseColor(sRGBHex);
        if (picked) onPick(picked);
      })
      .catch(() => undefined);
  };

  return { EyeDropperApi, pickFromScreen };
}
