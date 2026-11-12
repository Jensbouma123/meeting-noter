import { useEffect, type RefObject } from "react";
import type { DataListProps } from "@/components/ui/DataList/DataListProps";

export function useDataListLoadMore<T>(props: DataListProps<T>, sentinelRef: RefObject<HTMLDivElement | null>) {
  const {
    mode = "virtual",
    hasMore = false,
    isLoadingMore = false,
    onLoadMore,
    scrollThresholdPx = 200,
  } = props;

  useEffect(() => {
    if (mode !== "infinite" || !hasMore || isLoadingMore || !onLoadMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: `${scrollThresholdPx}px`,
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mode, hasMore, isLoadingMore, onLoadMore, scrollThresholdPx, sentinelRef]);
}
