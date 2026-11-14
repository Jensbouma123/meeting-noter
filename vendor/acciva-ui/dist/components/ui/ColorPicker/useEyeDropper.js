import { useSyncExternalStore } from "react";
import { parseColor } from "../../../lib/color/formats/index.js";
const noopSubscribe = () => () => undefined;
const serverSnapshot = () => undefined;
export function useEyeDropper(enabled, onPick) {
    // Read live on every render (honours `enabled` toggles) and report `undefined` during
    // SSR and hydration so server and client markup match.
    const EyeDropperApi = useSyncExternalStore(noopSubscribe, () => (enabled ? window.EyeDropper : undefined), serverSnapshot);
    const pickFromScreen = () => {
        if (!EyeDropperApi)
            return;
        new EyeDropperApi()
            .open()
            .then(({ sRGBHex }) => {
            const picked = parseColor(sRGBHex);
            if (picked)
                onPick(picked);
        })
            .catch(() => undefined);
    };
    return { EyeDropperApi, pickFromScreen };
}
