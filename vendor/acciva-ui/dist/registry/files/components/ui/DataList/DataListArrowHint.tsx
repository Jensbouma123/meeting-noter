import { ArrowHint } from "@/lib/ArrowHint";
import type { DataListView } from "@/components/ui/DataList/useDataListView";

interface DataListArrowHintProps<T> {
  hint: DataListView<T>["listHint"];
}

export function DataListArrowHint<T>({ hint }: DataListArrowHintProps<T>) {
  return <ArrowHint id={hint.id} text={hint.text} visible={hint.visible} />;
}
