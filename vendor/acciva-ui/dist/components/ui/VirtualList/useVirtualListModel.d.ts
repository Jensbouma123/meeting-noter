import { type RefObject } from "react";
import type { VirtualListProps } from "./types.js";
export declare function useVirtualListModel<T>(props: VirtualListProps<T>, scrollRef: RefObject<HTMLDivElement | null>): {
    scrollToTopEnabled: boolean;
    scrollToTopOptions: import("./types.js").VirtualListScrollToTopOptions | undefined;
    isScrollToTopVisible: boolean;
    isScrollToTopFullWidth: boolean;
    handleScrollToTop: () => void;
    handleScroll: () => void;
    handleKeyDown: (event: import("react").KeyboardEvent<HTMLDivElement>) => void;
    disabledAt: (index: number) => boolean;
    count: number;
    layout: import("./useVirtualLayout.js").VirtualLayout;
    range: import("./types.js").VirtualListRange;
    offsetAt: (index: number) => number;
    sizeAt: (index: number) => number;
    registerItem: (node: HTMLDivElement | null) => (() => void) | undefined;
    resolvedActiveIndex: number;
    itemId: (index: number) => string;
    containerStyle: import("react").CSSProperties;
    hint: {
        groupProps: {
            onFocusCapture: () => void;
            onBlurCapture: (event: import("react").FocusEvent<HTMLElement>) => void;
            onKeyDownCapture: (event: import("react").KeyboardEvent<HTMLElement>) => void;
        };
        visible: boolean;
        id: string;
        text: string | null;
        describedBy: (existing?: string) => string | undefined;
    };
};
