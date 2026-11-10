import { useCallback, useState } from "react";
export function useDataListReorder(props, resultKey) {
    const { onReorder } = props;
    const [activeIndex, setActiveIndex] = useState(0);
    // Polite announcement of the last reorder ("Moved item from position 2 to
    // position 3", SC 4.1.3). Stored with the result-set key it was made under, so
    // it is hidden (derived, no effect) once the result set changes.
    const [reorderNote, setReorderNote] = useState(null);
    // The reorder announcement describes the previous result set; drop it as soon
    // as filtering/sorting changes what the positions refer to.
    const visibleReorderNote = reorderNote && reorderNote.key === resultKey ? reorderNote.text : "";
    // Single-item reorder with final-index semantics: the consumer owns `items` and
    // applies the move. The active index follows the moved row and the move is
    // announced politely (SC 4.1.3).
    const handleReorderMove = useCallback((from, to) => {
        if (!onReorder || from === to)
            return;
        setActiveIndex(to);
        onReorder({ from, to });
        setReorderNote({
            text: `Moved item from position ${from + 1} to position ${to + 1}`,
            key: resultKey,
        });
    }, [onReorder, resultKey]);
    return { activeIndex, setActiveIndex, handleReorderMove, visibleReorderNote };
}
