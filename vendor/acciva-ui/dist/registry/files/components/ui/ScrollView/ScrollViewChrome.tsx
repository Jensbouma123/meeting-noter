import { WRAP_AT_HIDE_CONTROLS_CLASSES } from "@/components/ui/ScrollView/scrollViewClasses";
import {
  ScrollViewEndArrow,
  ScrollViewEndFade,
  ScrollViewStartArrow,
  ScrollViewStartFade,
} from "@/components/ui/ScrollView/ScrollViewParts";
import type {
  ScrollViewArrows,
  ScrollViewFadeEdges,
  ScrollViewState,
  ScrollViewWrapAt,
} from "@/components/ui/ScrollView/types";

interface ScrollViewChromeProps {
  isHorizontal: boolean;
  regionId: string;
  fadeEdges: ScrollViewFadeEdges;
  showArrows: ScrollViewArrows;
  wrapAt: ScrollViewWrapAt;
  scrollState: ScrollViewState;
  startArrowAriaLabel?: string;
  endArrowAriaLabel?: string;
  onStart: () => void;
  onEnd: () => void;
}

export function ScrollViewChrome({
  isHorizontal,
  regionId,
  fadeEdges,
  showArrows,
  wrapAt,
  scrollState,
  startArrowAriaLabel,
  endArrowAriaLabel,
  onStart,
  onEnd,
}: ScrollViewChromeProps) {
  const shouldRenderStartFade =
    fadeEdges === true || fadeEdges === "both" || fadeEdges === "start";
  const shouldRenderEndFade =
    fadeEdges === true || fadeEdges === "both" || fadeEdges === "end";

  const arrowsEnabled = showArrows !== false && showArrows !== "none";
  const arrowsHoverOnly = showArrows === "hover";
  const arrowsAuto = showArrows === true || showArrows === "auto";
  const arrowsAutoHidden = arrowsAuto && !scrollState.isScrollable;

  const hideControlsOnWrap = WRAP_AT_HIDE_CONTROLS_CLASSES[wrapAt];

  const defaultStartLabel = isHorizontal ? "Scroll left" : "Scroll up";
  const defaultEndLabel = isHorizontal ? "Scroll right" : "Scroll down";

  return (
    <>
      {shouldRenderStartFade && (
        <ScrollViewStartFade
          isHorizontal={isHorizontal}
          active={scrollState.canScrollStart}
          hideControlsOnWrap={hideControlsOnWrap}
        />
      )}

      {shouldRenderEndFade && (
        <ScrollViewEndFade
          isHorizontal={isHorizontal}
          active={scrollState.canScrollEnd}
          hideControlsOnWrap={hideControlsOnWrap}
        />
      )}

      {arrowsEnabled && (
        <ScrollViewStartArrow
          isHorizontal={isHorizontal}
          regionId={regionId}
          label={startArrowAriaLabel || defaultStartLabel}
          disabled={!scrollState.canScrollStart}
          hoverOnly={arrowsHoverOnly}
          autoHidden={arrowsAutoHidden}
          hideControlsOnWrap={hideControlsOnWrap}
          onClick={onStart}
        />
      )}

      {arrowsEnabled && (
        <ScrollViewEndArrow
          isHorizontal={isHorizontal}
          regionId={regionId}
          label={endArrowAriaLabel || defaultEndLabel}
          disabled={!scrollState.canScrollEnd}
          hoverOnly={arrowsHoverOnly}
          autoHidden={arrowsAutoHidden}
          hideControlsOnWrap={hideControlsOnWrap}
          onClick={onEnd}
        />
      )}
    </>
  );
}
