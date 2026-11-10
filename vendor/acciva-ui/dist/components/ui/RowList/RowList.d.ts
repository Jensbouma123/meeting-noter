import { type HTMLAttributes } from "react";
export interface RowListProps extends HTMLAttributes<HTMLUListElement> {
    /** Names the list for assistive tech (SC 1.3.1, 4.1.2). Required. */
    "aria-label": string;
    /** Draws a hairline between rows. */
    divided?: boolean;
}
export declare const RowList: import("react").ForwardRefExoticComponent<RowListProps & import("react").RefAttributes<HTMLUListElement>> & {
    Item: import("react").ForwardRefExoticComponent<import("./RowListItem.js").RowListItemProps & import("react").RefAttributes<HTMLLIElement>>;
};
