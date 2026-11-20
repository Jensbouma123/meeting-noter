export interface BleedCache {
  revision: number;
  spans: [number, number][];
  speakers: ReadonlySet<string>;
}
