import { useImperativeHandle } from "react";
export function useDataListImperative(props, nav) {
    const { listRef, mode = "virtual", layout = "list" } = props;
    const { activeColumns, virtualListRef, listContainerRef, handleClearSelection, handleSelectAll } = nav;
    useImperativeHandle(listRef, () => ({
        scrollToIndex: (index) => {
            if (mode === "virtual") {
                if (layout === "grid") {
                    const rowIndex = Math.floor(index / activeColumns);
                    virtualListRef.current?.scrollToIndex(rowIndex);
                }
                else {
                    virtualListRef.current?.scrollToIndex(index);
                }
            }
        },
        scrollToOffset: (offset) => {
            if (mode === "virtual") {
                virtualListRef.current?.scrollToOffset(offset);
            }
            else if (listContainerRef.current) {
                listContainerRef.current.scrollTop = offset;
            }
        },
        getScrollElement: () => {
            if (mode === "virtual") {
                return virtualListRef.current?.getScrollElement() ?? null;
            }
            return listContainerRef.current;
        },
        clearSelection: handleClearSelection,
        selectAll: handleSelectAll,
    }), [mode, layout, activeColumns, virtualListRef, listContainerRef, handleClearSelection, handleSelectAll]);
}
