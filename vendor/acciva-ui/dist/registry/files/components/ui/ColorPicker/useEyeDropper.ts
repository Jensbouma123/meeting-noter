import { useSyncExternalStore } from "react";
import { parseColor, type RGBA } from "@/lib/color/formats/index";

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };

const noopSubscribe = () => () => undefined;
const serverSnapshot = () => undefined;

export function useEyeDropper(enabled: boolean, onPick: (rgba: RGBA) => void) {
  // Read live on every render (honours `enabled` toggles) and report `undefined` during
  // SSR and hydration so server and client markup match.
  const EyeDropperApi = useSyncExternalStore(
    noopSubscribe,
    () => (enabled ? (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper : undefined),
    serverSnapshot,
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
