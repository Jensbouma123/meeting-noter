export type ROCallback = (
  entries: { target: Element; borderBoxSize?: { blockSize: number }[] }[],
) => void;
