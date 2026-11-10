import { useState } from "react";
import { parseColor } from "../../../lib/color/formats/index.js";
export function useEyeDropper(enabled, onPick) {
    const [EyeDropperApi] = useState(() => enabled && typeof window !== "undefined"
        ? window.EyeDropper
        : undefined);
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
