// Plain constant, deliberately outside theme-context.tsx's "use client" boundary —
// a Server Component (layout.tsx) importing a named export from a client module
// gets an opaque client reference, not the real string, so the blocking <head>
// script needs this value from a server-safe module instead.
export const THEME_STORAGE_KEY = "acciva-theme";
