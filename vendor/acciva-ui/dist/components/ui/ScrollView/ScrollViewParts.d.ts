interface ScrollViewFadeProps {
    isHorizontal: boolean;
    active: boolean;
    hideControlsOnWrap: string;
}
interface ScrollViewArrowProps {
    isHorizontal: boolean;
    regionId: string;
    label: string;
    disabled: boolean;
    hoverOnly: boolean;
    autoHidden: boolean;
    hideControlsOnWrap: string;
    onClick: () => void;
}
export declare function ScrollViewStartFade({ isHorizontal, active, hideControlsOnWrap }: ScrollViewFadeProps): import("react").JSX.Element;
export declare function ScrollViewEndFade({ isHorizontal, active, hideControlsOnWrap }: ScrollViewFadeProps): import("react").JSX.Element;
export declare function ScrollViewStartArrow({ isHorizontal, regionId, label, disabled, hoverOnly, autoHidden, hideControlsOnWrap, onClick, }: ScrollViewArrowProps): import("react").JSX.Element;
export declare function ScrollViewEndArrow({ isHorizontal, regionId, label, disabled, hoverOnly, autoHidden, hideControlsOnWrap, onClick, }: ScrollViewArrowProps): import("react").JSX.Element;
export {};
