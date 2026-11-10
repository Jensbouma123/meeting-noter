import { gatedRole, hexOf, role } from "./roles.js";
export function buildForegroundRoles(ramps, scale, background) {
    const canvasHex = hexOf(background.canvas);
    const surfaceHex = hexOf(background.surface);
    const raisedHex = hexOf(background.raised);
    const overlayHex = hexOf(background.overlay);
    const dialogHex = hexOf(background.dialog);
    return {
        primary: gatedRole(ramps, "neutral", scale.foreground.primary, "Body and heading text", [
            { use: "body", contexts: [canvasHex, surfaceHex, raisedHex, overlayHex, dialogHex] },
        ]),
        secondary: gatedRole(ramps, "neutral", scale.foreground.secondary, "Supporting text", [
            { use: "body", contexts: [canvasHex, surfaceHex, raisedHex] },
        ]),
        muted: gatedRole(ramps, "neutral", scale.foreground.muted, "Placeholder and metadata text", [{ use: "body", contexts: [canvasHex, surfaceHex] }]),
        disabled: role(ramps, "neutral", scale.foreground.disabled, "Disabled control text"),
        onInverse: gatedRole(ramps, "neutral", scale.foreground.onInverse, "Text on the inverted surface", [{ use: "body", contexts: [hexOf(background.inverse)] }]),
    };
}
