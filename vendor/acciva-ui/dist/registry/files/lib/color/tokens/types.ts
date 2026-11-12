import type { ThemeMode, Gamut, HarmonyMode, Hex } from "@/lib/color/types";

export type DtcgToken = {
  readonly $value: string;
  readonly $type: "color";
  readonly $description: string;
};

export type DtcgGroup = { readonly [key: string]: DtcgGroup | DtcgToken };

export type DtcgDocument = {
  readonly $description: string;
  readonly color: {
    readonly primitive: DtcgGroup;
    readonly semantic: Readonly<Record<ThemeMode, DtcgGroup>>;
    readonly component: Readonly<Record<ThemeMode, DtcgGroup>>;
  };
};

export type TokenGraphOptions = {
  readonly gamut?: Gamut;
  readonly harmony?: HarmonyMode;
  readonly precision?: number;
};
