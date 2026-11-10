const COMPONENT_TOKENS = [
    { path: ["button", "primary", "background"], group: "accent", role: "brand", $description: "Primary button fill" },
    { path: ["button", "primary", "backgroundHover"], group: "accent", role: "brandHover", $description: "Primary button fill, hovered" },
    { path: ["button", "primary", "backgroundActive"], group: "accent", role: "brandActive", $description: "Primary button fill, pressed" },
    { path: ["button", "primary", "foreground"], group: "accent", role: "onBrand", $description: "Primary button label" },
    { path: ["button", "primary", "border"], group: "accent", role: "brand", $description: "Primary button border" },
    { path: ["button", "secondary", "background"], group: "background", role: "surface", $description: "Secondary button fill" },
    { path: ["button", "secondary", "foreground"], group: "foreground", role: "primary", $description: "Secondary button label" },
    { path: ["button", "secondary", "border"], group: "border", role: "default", $description: "Secondary button border" },
    { path: ["button", "ghost", "foreground"], group: "accent", role: "brand", $description: "Ghost button label" },
    { path: ["button", "ghost", "backgroundHover"], group: "accent", role: "brandSubtle", $description: "Ghost button hover wash" },
    { path: ["button", "disabled", "background"], group: "background", role: "surface", $description: "Disabled button fill" },
    { path: ["button", "disabled", "foreground"], group: "foreground", role: "disabled", $description: "Disabled button label" },
    { path: ["input", "background"], group: "background", role: "surface", $description: "Text field fill" },
    { path: ["input", "foreground"], group: "foreground", role: "primary", $description: "Text field value" },
    { path: ["input", "placeholder"], group: "foreground", role: "muted", $description: "Text field placeholder" },
    { path: ["input", "border"], group: "border", role: "default", $description: "Text field border" },
    { path: ["input", "borderFocus"], group: "border", role: "focus", $description: "Text field focus indicator" },
    { path: ["input", "borderError"], group: "status", role: "dangerBorder", $description: "Text field border in an error state" },
    { path: ["card", "background"], group: "background", role: "surface", $description: "Card fill" },
    { path: ["card", "border"], group: "border", role: "subtle", $description: "Card border" },
    { path: ["card", "foreground"], group: "foreground", role: "primary", $description: "Card text" },
    { path: ["dialog", "background"], group: "background", role: "dialog", $description: "Dialog fill" },
    { path: ["dialog", "border"], group: "border", role: "subtle", $description: "Dialog border" },
    { path: ["dialog", "foreground"], group: "foreground", role: "primary", $description: "Dialog text" },
    { path: ["tooltip", "background"], group: "background", role: "inverse", $description: "Tooltip fill" },
    { path: ["tooltip", "foreground"], group: "foreground", role: "onInverse", $description: "Tooltip text" },
    { path: ["badge", "success", "background"], group: "status", role: "successSubtle", $description: "Success badge fill" },
    { path: ["badge", "success", "foreground"], group: "status", role: "success", $description: "Success badge label" },
    { path: ["badge", "success", "border"], group: "status", role: "successBorder", $description: "Success badge border" },
    { path: ["badge", "warning", "background"], group: "status", role: "warningSubtle", $description: "Warning badge fill" },
    { path: ["badge", "warning", "foreground"], group: "status", role: "warning", $description: "Warning badge label" },
    { path: ["badge", "warning", "border"], group: "status", role: "warningBorder", $description: "Warning badge border" },
    { path: ["badge", "danger", "background"], group: "status", role: "dangerSubtle", $description: "Danger badge fill" },
    { path: ["badge", "danger", "foreground"], group: "status", role: "danger", $description: "Danger badge label" },
    { path: ["badge", "danger", "border"], group: "status", role: "dangerBorder", $description: "Danger badge border" },
    { path: ["badge", "info", "background"], group: "status", role: "infoSubtle", $description: "Info badge fill" },
    { path: ["badge", "info", "foreground"], group: "status", role: "info", $description: "Info badge label" },
    { path: ["badge", "info", "border"], group: "status", role: "infoBorder", $description: "Info badge border" },
    { path: ["link", "foreground"], group: "accent", role: "brand", $description: "Inline link" },
    { path: ["link", "foregroundHover"], group: "accent", role: "brandHover", $description: "Inline link, hovered" },
    { path: ["focusRing", "color"], group: "border", role: "focus", $description: "Focus ring colour (WCAG 2.2 SC 2.4.11)" },
    { path: ["surface", "canvas"], group: "background", role: "canvas", $description: "Page canvas" },
    { path: ["surface", "raised"], group: "background", role: "raised", $description: "Raised surface" },
    { path: ["surface", "overlay"], group: "background", role: "overlay", $description: "Overlay surface" },
];
export function componentGroup(mode) {
    const root = {};
    for (const spec of COMPONENT_TOKENS) {
        let cursor = root;
        for (const segment of spec.path.slice(0, -1)) {
            const next = cursor[segment] ?? {};
            cursor[segment] = next;
            cursor = next;
        }
        const leaf = spec.path[spec.path.length - 1];
        cursor[leaf] = {
            $value: `{color.semantic.${mode}.${spec.group}.${spec.role}}`,
            $type: "color",
            $description: spec.$description,
        };
    }
    return root;
}
