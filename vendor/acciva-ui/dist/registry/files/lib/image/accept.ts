export type FileAcceptPreset = "images" | "documents" | "pdf";

export const ACCEPT_PRESETS: Readonly<Record<FileAcceptPreset, string>> = {
  images: "image/*",
  documents: ".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.xls,.xlsx,.ods,.ppt,.pptx,.odp",
  pdf: "application/pdf,.pdf",
};

const PRESET_LABELS: Readonly<Record<FileAcceptPreset, string>> = {
  images: "Images",
  documents: "Documents",
  pdf: "PDF",
};

const WILDCARD_LABELS: Readonly<Record<string, string>> = { image: "Images", video: "Videos", audio: "Audio" };

function isPreset(accept: string): accept is FileAcceptPreset {
  return Object.hasOwn(ACCEPT_PRESETS, accept);
}

/** Native `accept` attribute value; `undefined` when any type is allowed. */
export function resolveAccept(accept?: FileAcceptPreset | string): string | undefined {
  if (!accept) return undefined;
  return isPreset(accept) ? ACCEPT_PRESETS[accept] : accept;
}

function tokens(accept?: FileAcceptPreset | string): string[] {
  return (resolveAccept(accept) ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function matchesAccept(file: Pick<File, "name" | "type">, accept?: FileAcceptPreset | string): boolean {
  const list = tokens(accept);
  if (!list.length) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return list.some((t) => {
    if (t.startsWith(".")) return name.endsWith(t);
    if (!type) return false;
    if (t.endsWith("/*")) return type.startsWith(t.slice(0, -1));
    return type === t;
  });
}

/** Human summary of an accept value: "Images", "PDF", "PDF, DOCX". Empty when any type is allowed. */
export function describeAccept(accept?: FileAcceptPreset | string): string {
  if (accept && isPreset(accept)) return PRESET_LABELS[accept];
  const labels = tokens(accept).map((t) => {
    if (t.startsWith(".")) return t.slice(1).toUpperCase();
    const [major, minor = ""] = t.split("/");
    if (minor === "*") return WILDCARD_LABELS[major] ?? major.toUpperCase();
    return minor.replace(/^x-/, "").toUpperCase();
  });
  return [...new Set(labels)].join(", ");
}
