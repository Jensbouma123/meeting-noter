import { type DtcgDocument } from "../../tokens/index.js";
import type { FlattenedDocument } from "./types.js";
/** Flattens the graph into resolved, CSS-ready declarations grouped by mode. */
export declare function flattenDocument(doc: DtcgDocument): FlattenedDocument;
