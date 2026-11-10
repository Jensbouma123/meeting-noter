export type FileAcceptPreset = "images" | "documents" | "pdf";
export declare const ACCEPT_PRESETS: Readonly<Record<FileAcceptPreset, string>>;
/** Native `accept` attribute value; `undefined` when any type is allowed. */
export declare function resolveAccept(accept?: FileAcceptPreset | string): string | undefined;
export declare function matchesAccept(file: Pick<File, "name" | "type">, accept?: FileAcceptPreset | string): boolean;
/** Human summary of an accept value: "Images", "PDF", "PDF, DOCX". Empty when any type is allowed. */
export declare function describeAccept(accept?: FileAcceptPreset | string): string;
