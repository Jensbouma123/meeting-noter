export type HighlightConstructor = new (...ranges: Range[]) => object;

export interface HighlightRegistryLike {
  set(name: string, highlight: object): void;
  delete(name: string): void;
}

export interface HighlightApi {
  registry: HighlightRegistryLike;
  Highlight: HighlightConstructor;
}
