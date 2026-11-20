export interface LaunchDeps {
  navigate: (url: string) => void;
  openWeb: (url: string) => void;
  win: Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout">;
  doc: Pick<
    Document,
    "addEventListener" | "removeEventListener" | "visibilityState"
  >;
}
