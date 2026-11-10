import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { WRAP_AT_HIDE_CONTROLS_CLASSES } from "./scrollViewClasses.js";
import { ScrollViewEndArrow, ScrollViewEndFade, ScrollViewStartArrow, ScrollViewStartFade, } from "./ScrollViewParts.js";
export function ScrollViewChrome({ isHorizontal, regionId, fadeEdges, showArrows, wrapAt, scrollState, startArrowAriaLabel, endArrowAriaLabel, onStart, onEnd, }) {
    const shouldRenderStartFade = fadeEdges === true || fadeEdges === "both" || fadeEdges === "start";
    const shouldRenderEndFade = fadeEdges === true || fadeEdges === "both" || fadeEdges === "end";
    const arrowsEnabled = showArrows !== false && showArrows !== "none";
    const arrowsHoverOnly = showArrows === "hover";
    const arrowsAuto = showArrows === true || showArrows === "auto";
    const arrowsAutoHidden = arrowsAuto && !scrollState.isScrollable;
    const hideControlsOnWrap = WRAP_AT_HIDE_CONTROLS_CLASSES[wrapAt];
    const defaultStartLabel = isHorizontal ? "Scroll left" : "Scroll up";
    const defaultEndLabel = isHorizontal ? "Scroll right" : "Scroll down";
    return (_jsxs(_Fragment, { children: [shouldRenderStartFade && (_jsx(ScrollViewStartFade, { isHorizontal: isHorizontal, active: scrollState.canScrollStart, hideControlsOnWrap: hideControlsOnWrap })), shouldRenderEndFade && (_jsx(ScrollViewEndFade, { isHorizontal: isHorizontal, active: scrollState.canScrollEnd, hideControlsOnWrap: hideControlsOnWrap })), arrowsEnabled && (_jsx(ScrollViewStartArrow, { isHorizontal: isHorizontal, regionId: regionId, label: startArrowAriaLabel || defaultStartLabel, disabled: !scrollState.canScrollStart, hoverOnly: arrowsHoverOnly, autoHidden: arrowsAutoHidden, hideControlsOnWrap: hideControlsOnWrap, onClick: onStart })), arrowsEnabled && (_jsx(ScrollViewEndArrow, { isHorizontal: isHorizontal, regionId: regionId, label: endArrowAriaLabel || defaultEndLabel, disabled: !scrollState.canScrollEnd, hoverOnly: arrowsHoverOnly, autoHidden: arrowsAutoHidden, hideControlsOnWrap: hideControlsOnWrap, onClick: onEnd }))] }));
}
