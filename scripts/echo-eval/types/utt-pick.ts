export interface UttPick {
  id: string;
  seconds: number;
}

export type UttPool = Map<string, UttPick[]>;
