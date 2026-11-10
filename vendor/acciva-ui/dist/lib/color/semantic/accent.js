import { gatedRole, hexOf, onColorRole, role } from "./roles.js";
export function buildAccentRoles(ramps, scale, background) {
    const canvasHex = hexOf(background.canvas);
    const surfaceHex = hexOf(background.surface);
    const brandSubtle = role(ramps, "brand", scale.accent.subtle, "Tinted brand background");
    const secondarySubtle = role(ramps, "accent", scale.accent.subtle, "Tinted secondary background");
    const accentBase = gatedRole(ramps, "brand", scale.accent.base, "Primary brand action", [{ use: "body", contexts: [canvasHex, surfaceHex, hexOf(brandSubtle)] }]);
    const secondaryBase = gatedRole(ramps, "accent", scale.accent.base, "Secondary harmony action", [
        { use: "body", contexts: [hexOf(secondarySubtle)] },
        { use: "large", contexts: [canvasHex, surfaceHex] },
    ]);
    return {
        brand: accentBase,
        brandHover: role(ramps, "brand", scale.accent.hover, "Primary brand action, hovered"),
        brandActive: role(ramps, "brand", scale.accent.active, "Primary brand action, pressed"),
        brandSubtle,
        onBrand: onColorRole(ramps, accentBase, "Text and icons on the brand action"),
        secondary: secondaryBase,
        secondaryHover: role(ramps, "accent", scale.accent.hover, "Secondary action, hovered"),
        secondarySubtle,
        onSecondary: onColorRole(ramps, secondaryBase, "Text and icons on the secondary action"),
    };
}
