import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { cn } from "../../../lib/utils.js";
import { Skeleton } from "../Skeleton.js";
import { Tab, TabList, TabPanel, Tabs } from "../Tabs/index.js";
import { Text } from "../Text.js";
export function CropAspectSwitch({ aspect, aspectOptions, inert, messages, onSelect, stage }) {
    const options = aspectOptions && aspectOptions.length > 1 ? aspectOptions : undefined;
    if (!options)
        return stage;
    return (_jsxs(Tabs, { value: String(aspect), onValueChange: onSelect, size: "sm", children: [_jsx(TabList, { "aria-label": messages.aspect, className: "flex w-full md:w-auto", children: options.map((option) => (_jsx(Tab, { value: String(option), disabled: inert, className: "flex-1 justify-center md:flex-none", children: messages.aspectLabel(option) }, String(option)))) }), options.some((option) => String(option) === String(aspect)) ? (_jsx(TabPanel, { value: String(aspect), className: "mt-3", children: stage })) : (_jsx("div", { className: "mt-3", children: stage }))] }));
}
export function CropStage({ setStage, zoom, inert, failed, crop, messages, onPointerDown, onPointerMove, onPointerEnd, }) {
    return (_jsxs("div", { ref: setStage, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, className: cn("relative h-72 w-full touch-none select-none overflow-hidden rounded-md bg-elevation-2 md:h-96", zoom > 1 && !inert && "cursor-grab"), children: [crop, failed ? (_jsx("div", { className: "absolute inset-0 flex items-center justify-center p-4", children: _jsx(Text, { size: "sm", variant: "danger", align: "center", children: messages.error }) })) : !crop ? (_jsxs(_Fragment, { children: [_jsx(Skeleton, { variant: "rectangular", className: "absolute inset-0 h-full" }), _jsx("span", { className: "sr-only", children: messages.loading })] })) : null] }));
}
