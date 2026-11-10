import { type NavSearchItem } from "./NavHeaderData.js";
interface NavHeaderDrawerDocsProps {
    items: NavSearchItem[];
    closeMenu: () => void;
}
export declare function NavHeaderDrawerDocs({ items, closeMenu }: NavHeaderDrawerDocsProps): import("react").JSX.Element;
export {};
